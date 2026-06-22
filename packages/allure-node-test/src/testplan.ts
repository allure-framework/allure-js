import { createRequire } from "node:module";

import { LabelName } from "allure-js-commons";
import { extractMetadataFromString, type TestPlanV1 } from "allure-js-commons/sdk";
import { addSkipLabelAsMeta, includedInTestPlan, parseTestPlan } from "allure-js-commons/sdk/reporter";

import { ALLURE_NODE_TEST_TESTPLAN_FILTER_ENV, type NodeTestContext } from "./model.js";
import { runWithNodeTestHookContext } from "./runtime.js";
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

export const installCommonJsNodeTestWrappers = () => {
  const require = createRequire(`${process.cwd()}/`);
  const nodeTest = require("node:test") as NodeTestModule;
  const wrappers = applyNodeTestWrappers(nodeTest);

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

export const applyNodeTestWrappers = (nodeTest: NodeTestModule): NodeTestWrappers => {
  if (testPlan) {
    process.env[ALLURE_NODE_TEST_TESTPLAN_FILTER_ENV] = "1";
  }

  const originalTest = nodeTest.test ?? nodeTest.it;
  const originalDescribe = nodeTest.describe;
  const originalSuite = nodeTest.suite;
  const before = wrapHook(nodeTest.before, "suite");
  const beforeEach = wrapHook(nodeTest.beforeEach, "test");
  const after = wrapHook(nodeTest.after, "suite");
  const afterEach = wrapHook(nodeTest.afterEach, "test");

  if (!originalTest || !originalDescribe || !originalSuite) {
    return {
      ...(nodeTest as NodeTestWrappers),
      after,
      afterEach,
      before,
      beforeEach,
    };
  }

  const test = testPlan ? wrapTest(originalTest) : originalTest;
  const describe = testPlan ? wrapSuite(originalDescribe) : originalDescribe;
  const suite = testPlan ? wrapSuite(originalSuite) : originalSuite;

  test.it = test;
  test.test = test;
  test.describe = describe;
  test.suite = suite;
  test.before = before;
  test.beforeEach = beforeEach;
  test.after = after;
  test.afterEach = afterEach;
  test.run = nodeTest.run;
  test.skip = testPlan ? wrapTestModifier(originalTest, "skip") : originalTest.skip;
  test.todo = testPlan ? wrapTestModifier(originalTest, "todo") : originalTest.todo;
  test.only = testPlan ? wrapTestModifier(originalTest, "only") : originalTest.only;

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
  setIfWritable(nodeTest, "before", before);
  setIfWritable(nodeTest, "beforeEach", beforeEach);
  setIfWritable(nodeTest, "after", after);
  setIfWritable(nodeTest, "afterEach", afterEach);

  return {
    after,
    afterEach,
    before,
    beforeEach,
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

const wrapHook = (originalHook: NodeTestFunction | undefined, contextType: "suite" | "test"): NodeTestFunction => {
  if (!originalHook) {
    return originalHook as unknown as NodeTestFunction;
  }

  const wrapped = function allureNodeTestHookWithContext(this: unknown, ...args: any[]) {
    const callbackIndex = args.findIndex((arg) => typeof arg === "function");

    if (callbackIndex === -1) {
      return originalHook.call(this, ...args);
    }

    const nextArgs = [...args];
    const originalCallback = nextArgs[callbackIndex];

    nextArgs[callbackIndex] = function allureNodeTestHookCallback(this: unknown, ...callbackArgs: any[]) {
      const context = callbackArgs[0];

      if (!isNodeTestContext(context)) {
        return originalCallback.apply(this, callbackArgs);
      }

      return runWithNodeTestHookContext(context, contextType, () => originalCallback.apply(this, callbackArgs));
    };

    return originalHook.call(this, ...nextArgs);
  } as NodeTestFunction;

  Object.assign(wrapped, originalHook);

  return wrapped;
};

const isNodeTestContext = (value: unknown): value is NodeTestContext => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const context = value as NodeTestContext;

  return (
    typeof context.filePath === "string" || typeof context.fullName === "string" || typeof context.name === "string"
  );
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
