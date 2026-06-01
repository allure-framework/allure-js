import { createRequire } from "node:module";

import { LabelName } from "allure-js-commons";
import { extractMetadataFromString, type TestPlanV1 } from "allure-js-commons/sdk";
import { addSkipLabelAsMeta, includedInTestPlan, parseTestPlan } from "allure-js-commons/sdk/reporter";

import { ALLURE_NODE_TEST_TESTPLAN_FILTER_ENV } from "./model.js";
import { getAllureFullNameFromParts, getFallbackNodeFullName, normalizeFilePath } from "./utils.js";

type NodeTestFunction = ((...args: any[]) => unknown) & Record<string, any>;
type NodeTestModule = Record<string, any> & {
  describe?: NodeTestFunction;
  it?: NodeTestFunction;
  suite?: NodeTestFunction;
  test?: NodeTestFunction;
};

type NodeTestWrappers = {
  after: NodeTestFunction;
  afterEach: NodeTestFunction;
  before: NodeTestFunction;
  beforeEach: NodeTestFunction;
  describe: NodeTestFunction;
  it: NodeTestFunction;
  suite: NodeTestFunction;
  test: NodeTestFunction;
};

type CommonJsLoad = (request: string, parent?: unknown, isMain?: boolean) => unknown;
type CommonJsModule = {
  _allureNodeTestOriginalLoad?: CommonJsLoad;
  _load: CommonJsLoad;
};

type TestPlanSubject = {
  readonly allureId?: string;
  readonly fullName?: string;
  readonly id?: string;
  readonly nativeSelector?: string;
  readonly tags?: string[];
};

const suiteStack: string[] = [];
const testPlan = parseTestPlan();

export const hasExecutableTestPlan = () => !!testPlan;

export const installCommonJsTestPlanFilter = () => {
  if (!testPlan) {
    return;
  }

  const require = createRequire(`${process.cwd()}/`);
  const nodeTest = require("node:test") as NodeTestModule;
  const wrappers = applyNodeTestPlanFilter(nodeTest);

  installCommonJsLoadFilter(require("node:module") as CommonJsModule, wrappers);
};

const installCommonJsLoadFilter = (commonJsModule: CommonJsModule, wrappers: NodeTestWrappers) => {
  if (commonJsModule._allureNodeTestOriginalLoad) {
    return;
  }

  const originalLoad = commonJsModule._load;

  // `require("node:test")` returns a callable export, so property mutation alone cannot replace direct calls.
  commonJsModule._allureNodeTestOriginalLoad = originalLoad;
  commonJsModule._load = function allureNodeTestPlanCommonJsLoad(
    this: unknown,
    request: string,
    parent?: unknown,
    isMain?: boolean,
  ) {
    if (request === "node:test") {
      return wrappers.test;
    }

    return originalLoad.call(this, request, parent, isMain);
  };
};

export const applyNodeTestPlanFilter = (nodeTest: NodeTestModule): NodeTestWrappers => {
  process.env[ALLURE_NODE_TEST_TESTPLAN_FILTER_ENV] = "1";

  const originalTest = nodeTest.test ?? nodeTest.it;
  const originalDescribe = nodeTest.describe;
  const originalSuite = nodeTest.suite;

  if (!originalTest || !originalDescribe || !originalSuite) {
    return nodeTest as NodeTestWrappers;
  }

  const test = wrapTest(originalTest);
  const describe = wrapSuite(originalDescribe);
  const suite = wrapSuite(originalSuite);

  test.it = test;
  test.test = test;
  test.describe = describe;
  test.suite = suite;
  test.before = nodeTest.before;
  test.beforeEach = nodeTest.beforeEach;
  test.after = nodeTest.after;
  test.afterEach = nodeTest.afterEach;
  test.run = nodeTest.run;
  test.skip = wrapTestModifier(originalTest, "skip");
  test.todo = wrapTestModifier(originalTest, "todo");
  test.only = wrapTestModifier(originalTest, "only");

  describe.skip = originalDescribe.skip;
  describe.todo = originalDescribe.todo;
  describe.only = originalDescribe.only;
  suite.skip = originalSuite.skip;
  suite.todo = originalSuite.todo;
  suite.only = originalSuite.only;

  setIfWritable(nodeTest, "test", test);
  setIfWritable(nodeTest, "it", test);
  setIfWritable(nodeTest, "describe", describe);
  setIfWritable(nodeTest, "suite", suite);

  return {
    after: nodeTest.after,
    afterEach: nodeTest.afterEach,
    before: nodeTest.before,
    beforeEach: nodeTest.beforeEach,
    describe,
    it: test,
    suite,
    test,
  };
};

const setIfWritable = (target: NodeTestModule, key: string, value: unknown) => {
  try {
    target[key] = value;
  } catch {
    // ESM namespace objects are immutable; the loader path returns wrappers directly.
  }
};

const wrapTest = (originalTest: NodeTestFunction): NodeTestFunction => {
  const wrapped = function allureNodeTestPlanFilteredTest(this: unknown, ...args: any[]) {
    if (!shouldRunTest(args)) {
      return originalTest.skip.call(this, ...markSkippedByTestPlan(args));
    }

    return originalTest.call(this, ...args);
  } as NodeTestFunction;

  Object.assign(wrapped, originalTest);

  return wrapped;
};

const wrapTestModifier = (originalTest: NodeTestFunction, modifier: "only" | "skip" | "todo"): NodeTestFunction => {
  const originalModifier = originalTest[modifier] as NodeTestFunction | undefined;

  if (!originalModifier) {
    return originalModifier as unknown as NodeTestFunction;
  }

  const wrapped = function allureNodeTestPlanFilteredModifier(this: unknown, ...args: any[]) {
    if (!shouldRunTest(args)) {
      return originalTest.skip.call(this, ...markSkippedByTestPlan(args));
    }

    return originalModifier.call(this, ...args);
  } as NodeTestFunction;

  Object.assign(wrapped, originalModifier);

  return wrapped;
};

const wrapSuite = (originalSuite: NodeTestFunction): NodeTestFunction => {
  const wrapped = function allureNodeTestPlanTrackedSuite(this: unknown, ...args: any[]) {
    const name = getTestName(args);
    const callbackIndex = args.findIndex((arg) => typeof arg === "function");

    if (!name || callbackIndex === -1) {
      return originalSuite.call(this, ...args);
    }

    const nextArgs = [...args];
    const originalCallback = nextArgs[callbackIndex];

    nextArgs[callbackIndex] = function allureNodeTestPlanSuiteCallback(this: unknown, ...callbackArgs: any[]) {
      suiteStack.push(name);

      try {
        return originalCallback.apply(this, callbackArgs);
      } finally {
        suiteStack.pop();
      }
    };

    return originalSuite.call(this, ...nextArgs);
  } as NodeTestFunction;

  Object.assign(wrapped, originalSuite);

  return wrapped;
};

const shouldRunTest = (args: readonly unknown[]) => {
  if (!testPlan) {
    return true;
  }

  const name = getTestName(args);

  if (!name) {
    return false;
  }

  const { cleanTitle, labels } = extractMetadataFromString(name);
  const allureId = labels.find(({ name: labelName }) => labelName === LabelName.ALLURE_ID)?.value;
  const cleanName = cleanTitle || name;
  const nodeFullName = getFallbackNodeFullName(suiteStack, name);
  const cleanNodeFullName = getFallbackNodeFullName(suiteStack, cleanName);
  const fullName = getAllureFullNameFromParts(getRegistrationFile(), suiteStack.concat(name));
  const cleanFullName = getAllureFullNameFromParts(getRegistrationFile(), suiteStack.concat(cleanName));

  return [
    { fullName, id: allureId, nativeSelector: nodeFullName, tags: [name] },
    { fullName: cleanFullName, id: allureId, nativeSelector: cleanNodeFullName, tags: [name] },
    { fullName: nodeFullName, id: allureId, tags: [name] },
    { fullName: cleanNodeFullName, id: allureId, tags: [name] },
    { fullName: cleanName, id: allureId, tags: [name] },
  ].some((subject) => includedInTestPlanOrHasSelectedDescendant(testPlan, subject));
};

const includedInTestPlanOrHasSelectedDescendant = (plan: TestPlanV1, subject: TestPlanSubject) => {
  return includedInTestPlan(plan, subject) || hasSelectedDescendant(plan, subject);
};

const hasSelectedDescendant = (plan: TestPlanV1, subject: TestPlanSubject) => {
  const selectors = [subject.fullName, subject.nativeSelector].filter((selector): selector is string => !!selector);

  return plan.tests.some(({ selector: testSelector }) =>
    selectors.some((selector) => isDescendantSelector(selector, testSelector)),
  );
};

const isDescendantSelector = (parentSelector: string, selectedSelector: string | undefined) => {
  if (!selectedSelector || selectedSelector === parentSelector) {
    return false;
  }

  return selectedSelector.startsWith(`${parentSelector} `) || selectedSelector.startsWith(`${parentSelector} > `);
};

const getTestName = (args: readonly unknown[]) => {
  if (typeof args[0] === "string") {
    return args[0];
  }

  const callback = args.find((arg): arg is Function => typeof arg === "function");

  return callback?.name;
};

const markSkippedByTestPlan = (args: readonly unknown[]) => {
  const nextArgs = [...args];

  if (typeof nextArgs[0] === "string") {
    nextArgs[0] = addSkipLabelAsMeta(nextArgs[0]);

    return nextArgs;
  }

  const name = getTestName(args) || "unnamed test";

  return [addSkipLabelAsMeta(name), ...nextArgs];
};

const getRegistrationFile = () => {
  const stack = new Error().stack;

  if (!stack) {
    return undefined;
  }

  for (const line of stack.split("\n")) {
    if (line.includes("node:internal")) {
      continue;
    }

    const match = line.match(/(?:\()?(file:\/\/[^):]+|\/[^):]+):\d+:\d+\)?/);
    const file = match?.[1];

    if (file) {
      const normalizedFile = normalizeFilePath(file.startsWith("file://") ? new URL(file).pathname : file);

      if (!isAllureNodeTestImplementationFile(normalizedFile)) {
        return normalizedFile;
      }
    }
  }

  return undefined;
};

const isAllureNodeTestImplementationFile = (file: string | undefined) => {
  if (!file) {
    return false;
  }

  return (
    file.includes("/node_modules/allure-node-test/") ||
    file.includes("/packages/allure-node-test/dist/") ||
    file.includes("/packages/allure-node-test/src/")
  );
};
