import { LabelName, Status } from "allure-js-commons";
import { extractMetadataFromString, getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { ALLURE_REPORT_STEP_COMMAND, ALLURE_REPORT_SYSTEM_HOOK } from "./model.js";
import type { CypressCommand, CypressHook, CypressSuite, CypressTest } from "./model.js";
import { getAllureTestPlan } from "./state.js";

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const getSuitePath = (test: CypressTest): string[] => {
  const path: string[] = [];
  let currentSuite: CypressSuite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};

export const shouldCommandBeSkipped = (command: CypressCommand) => {
  if (last(command.attributes.args)?.log === false) {
    return true;
  }

  if (command.attributes.name === "task" && command.attributes.args[0] === "reportAllureRuntimeMessages") {
    return true;
  }

  // we don't need to report then commands because it's just a promise handle
  if (command.attributes.name === "then") {
    return true;
  }

  // we should skip artificial wrap from allure steps
  if (command.attributes.name === "wrap" && command.attributes.args[0] === ALLURE_REPORT_STEP_COMMAND) {
    return true;
  }

  return false;
};

export const toReversed = <T = unknown>(arr: T[]): T[] => {
  const result: T[] = [];

  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }

  return result;
};

export const last = <T = unknown>(arr: T[]): T | undefined => {
  return arr[arr.length - 1];
};

export const getNamesAndLabels = (spec: Cypress.Spec, test: CypressTest) => {
  const rawName = test.title;
  const { cleanTitle: name, labels } = extractMetadataFromString(rawName);
  const suites = test.titlePath().slice(0, -1);
  const fullName = `${spec.relative}#${[...suites, name].join(" ")}`;
  return { name, labels, fullName };
};

export const getTestStartData = (test: CypressTest) => ({
  ...getNamesAndLabels(Cypress.spec, test),
  start: test.wallClockStartedAt?.getTime() || Date.now(),
});

export const getTestStopData = (test: CypressTest) => ({
  duration: test.duration ?? 0,
  retries: (test as any)._retries ?? 0,
});

export const getTestSkipData = () => ({
  statusDetails: { message: "This is a pending test" },
});

export const applyTestPlan = (spec: Cypress.Spec, root: CypressSuite) => {
  const testPlan = getAllureTestPlan();
  if (testPlan) {
    for (const suite of iterateSuites(root)) {
      const indicesToRemove = getIndicesOfDeselectedTests(testPlan, spec, suite.tests);
      removeSortedIndices(suite.tests, indicesToRemove);
    }
  }
};

export const resolveStatusWithDetails = (error: Error | undefined) =>
  error
    ? {
        status: getStatusFromError(error),
        statusDetails: getMessageAndTraceFromError(error),
      }
    : { status: Status.PASSED };

const testReportedKey = Symbol("The test was reported to Allure");

export const markTestAsReported = (test: CypressTest) => {
  (test as any)[testReportedKey] = true;
};

export const isTestReported = (test: CypressTest) => (test as any)[testReportedKey] === true;

export const iterateSuites = function* (parent: CypressSuite) {
  const suiteQueue: CypressSuite[] = [];
  for (let s: CypressSuite | undefined = parent; s; s = suiteQueue.shift()) {
    yield s;
    suiteQueue.push(...s.suites);
  }
};

export const iterateTests = function* (parent: CypressSuite) {
  for (const suite of iterateSuites(parent)) {
    yield* suite.tests;
  }
};

export const isAllureHook = (hook: CypressHook) => hook.title.includes(ALLURE_REPORT_SYSTEM_HOOK);

export const isRootAfterAllHook = (hook: CypressHook) => hook.parent!.root && hook.hookName === "after all";

const includedInTestPlan = (testPlan: TestPlanV1, fullName: string, allureId: string | undefined): boolean =>
  testPlan.tests.some((test) => (allureId && test.id?.toString() === allureId) || test.selector === fullName);

const getIndicesOfDeselectedTests = (testPlan: TestPlanV1, spec: Cypress.Spec, tests: readonly CypressTest[]) => {
  const indicesToRemove: number[] = [];
  tests.forEach((test, index) => {
    const { fullName, labels } = getNamesAndLabels(spec, test);
    const allureId = labels.find(({ name }) => name === LabelName.ALLURE_ID)?.value;

    if (!includedInTestPlan(testPlan, fullName, allureId)) {
      indicesToRemove.push(index);
    }
  });
  return indicesToRemove;
};

const removeSortedIndices = <T>(arr: T[], indices: readonly number[]) => {
  for (let i = indices.length - 1; i >= 0; i--) {
    arr.splice(indices[i], 1);
  }
};
