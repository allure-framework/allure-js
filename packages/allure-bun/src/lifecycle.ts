import { sep } from "node:path";

import { LabelName, Stage, Status, type TestResult } from "allure-js-commons";
import { serialize } from "allure-js-commons/sdk";
import { extractMetadataFromString, getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import {
  getEnvironmentLabels,
  getFrameworkLabel,
  getHostLabel,
  getLanguageLabel,
  getPackageLabel,
  getSuiteLabels,
  getThreadLabel,
} from "allure-js-commons/sdk/reporter";

import { FAILING_UNEXPECTED_PASS_MESSAGE, TODO_MESSAGE, TODO_UNEXPECTED_PASS_MESSAGE } from "./constants.js";
import {
  getRegisteredTestFullName,
  getSuiteNames,
  getSuitePath,
  isSuiteDescendantOf,
  isTestSelectedByBunNamePattern,
} from "./state.js";
import type {
  BunDescribeBlock,
  BunFileContext,
  BunHookType,
  BunOriginalFn,
  BunRegisteredTest,
  BunRunState,
} from "./types.js";
import { last } from "./utils.js";

type BunLifecycleDeps = {
  activateFileContext: (fileContext: BunFileContext) => void;
  throwConcurrentUnsupported: () => never;
};

const adaptErrorForJestStatus = (error: unknown) => {
  if (!(error instanceof Error)) {
    return error;
  }

  if (error.name === "AssertionError" || /^expect\s*\(/.test(error.message) || /Expected:/.test(error.message)) {
    error.name = "AssertionError";
  }

  return error;
};

const getStatusAndDetails = (errors: unknown[]) => {
  if (errors.length === 0) {
    return { status: Status.PASSED, details: {} };
  }

  const error = errors[0];

  if (error instanceof Error) {
    return {
      status: getStatusFromError(error),
      details: getMessageAndTraceFromError(error),
    };
  }

  return {
    status: Status.BROKEN,
    details: { message: serialize(error) },
  };
};

const suiteLabelNames = new Set<string>([LabelName.PARENT_SUITE, LabelName.SUITE, LabelName.SUB_SUITE]);

const makeUserSuiteLabelsOverrideGenerated = (allureResult: TestResult) => {
  const lastSuiteLabelIndexes = new Map<string, number>();

  allureResult.labels.forEach((label, index) => {
    if (suiteLabelNames.has(label.name)) {
      lastSuiteLabelIndexes.set(label.name, index);
    }
  });

  allureResult.labels = allureResult.labels.filter((label, index) => {
    if (!suiteLabelNames.has(label.name)) {
      return true;
    }

    return lastSuiteLabelIndexes.get(label.name) === index;
  });
};

const writeTestResult = (fileContext: BunFileContext, testUuid: string) => {
  fileContext.allureRuntime.updateTest(testUuid, makeUserSuiteLabelsOverrideGenerated);
  fileContext.allureRuntime.writeTest(testUuid);
};

const writeRunMetadata = (runState: BunRunState, allureRuntime: BunFileContext["allureRuntime"]) => {
  if (!runState.allureEnvironmentInfoWritten && allureRuntime.environmentInfo !== undefined) {
    allureRuntime.writeEnvironmentInfo();
    runState.allureEnvironmentInfoWritten = true;
  }

  if (!runState.allureCategoriesWritten && allureRuntime.categories !== undefined) {
    allureRuntime.writeCategoriesDefinitions();
    runState.allureCategoriesWritten = true;
  }
};

const getAttemptParameters = (test: BunRegisteredTest) => {
  if (test.attempt === 0) {
    return [];
  }

  return [
    {
      name: test.lastStatus === Status.PASSED ? "Repetition" : "Retry",
      value: String(test.attempt),
      excluded: true,
    },
  ];
};

const startAllureTest = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const { allureRuntime, testPath, scopes } = fileContext;
  const suitePath = getSuiteNames(test.parent);
  const fsPath = testPath.split(sep);
  const titlePath = fsPath.concat(suitePath);
  const { cleanTitle, labels, links } = extractMetadataFromString(test.name);
  const fullName = getRegisteredTestFullName(fileContext, test);
  const testUuid = allureRuntime.startTest(
    {
      name: cleanTitle,
      fullName,
      start: test.startedAt || undefined,
      stage: Stage.RUNNING,
      labels: [
        getLanguageLabel(),
        getFrameworkLabel("bun"),
        getPackageLabel(testPath),
        getHostLabel(),
        getThreadLabel(undefined),
        ...getEnvironmentLabels(),
        ...getSuiteLabels(suitePath),
        ...labels,
      ],
      titlePath,
      links,
      parameters: [...test.parameters, ...getAttemptParameters(test)],
    },
    scopes,
  );

  fileContext.executables.push(testUuid);
};

export const ensureRootScope = (fileContext: BunFileContext) => {
  if (fileContext.rootScopeActive) {
    return;
  }

  fileContext.scopes.push(fileContext.allureRuntime.startScope());
  fileContext.rootScopeActive = true;
};

export const transitionToSuite = (fileContext: BunFileContext, suite: BunDescribeBlock) => {
  const targetPath = getSuitePath(suite);
  let sharedLength = 0;

  while (
    sharedLength < fileContext.activeSuites.length &&
    sharedLength < targetPath.length &&
    fileContext.activeSuites[sharedLength] === targetPath[sharedLength]
  ) {
    sharedLength += 1;
  }

  while (fileContext.activeSuites.length > sharedLength) {
    const scopeUuid = fileContext.scopes.pop();

    if (scopeUuid) {
      fileContext.allureRuntime.writeScope(scopeUuid);
    }
    fileContext.activeSuites.pop();
  }

  while (fileContext.activeSuites.length < targetPath.length) {
    fileContext.activeSuites.push(targetPath[fileContext.activeSuites.length]!);
    fileContext.scopes.push(fileContext.allureRuntime.startScope());
  }
};

const advancePendingIndex = (fileContext: BunFileContext) => {
  while (fileContext.tests[fileContext.nextPendingTestIndex]?.completed) {
    fileContext.nextPendingTestIndex += 1;
  }
};

const claimNextPendingTest = (fileContext: BunFileContext, expected?: BunRegisteredTest) => {
  advancePendingIndex(fileContext);

  if (!expected) {
    const next = fileContext.tests[fileContext.nextPendingTestIndex];

    if (!next) {
      return undefined;
    }

    fileContext.nextPendingTestIndex += 1;
    return next;
  }

  if (expected.completed) {
    return expected;
  }

  const expectedIndex = fileContext.tests.indexOf(expected);

  if (expectedIndex === -1) {
    return expected;
  }

  if (fileContext.nextPendingTestIndex <= expectedIndex) {
    fileContext.nextPendingTestIndex = expectedIndex + 1;
  }

  return expected;
};

const startRegisteredTest = (deps: BunLifecycleDeps, fileContext: BunFileContext, test: BunRegisteredTest) => {
  if (test.started && !test.completed) {
    return test;
  }

  claimNextPendingTest(fileContext, test);

  if (fileContext.nextRetryTest === test) {
    fileContext.nextRetryTest = undefined;
  }

  ensureRootScope(fileContext);
  transitionToSuite(fileContext, test.parent);
  deps.activateFileContext(fileContext);

  test.attempt = test.startedAttempts;
  test.startedAttempts += 1;
  test.started = true;
  test.completed = false;
  test.resultEmitted = false;
  test.errors = [];

  delete test.duration;

  test.startedAt = Date.now();
  fileContext.currentTest = test;

  fileContext.scopes.push(fileContext.allureRuntime.startScope());
  startAllureTest(fileContext, test);
  test.resultEmitted = true;

  return test;
};

export const ensureCurrentTest = (
  deps: BunLifecycleDeps,
  fileContext: BunFileContext,
  expected?: BunRegisteredTest,
) => {
  expected ??= fileContext.nextRetryTest;

  if (fileContext.currentTest) {
    if (expected && fileContext.currentTest !== expected && !fileContext.currentTest.completed) {
      deps.throwConcurrentUnsupported();
    }

    return fileContext.currentTest;
  }

  const nextTest = claimNextPendingTest(fileContext, expected);

  if (!nextTest) {
    return undefined;
  }

  return startRegisteredTest(deps, fileContext, nextTest);
};

export const finalizeTest = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  if (test.completed || !test.resultEmitted) {
    return;
  }

  test.duration ??= Math.max(Date.now() - test.startedAt, 0);

  const testUuid = fileContext.executables.pop();

  if (testUuid) {
    let currentStatus: Status | undefined;
    fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
      currentStatus = allureResult.status;
    });

    let finalStatus = currentStatus;

    if (finalStatus === undefined) {
      const { details } = getStatusAndDetails(test.errors);

      fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
        allureResult.stage = Stage.FINISHED;
        allureResult.status = Status.SKIPPED;
        allureResult.statusDetails = { ...allureResult.statusDetails, ...details };
      });

      fileContext.allureRuntime.stopTest(testUuid, { duration: 0 });
      finalStatus = Status.SKIPPED;
    }

    test.lastStatus = finalStatus;
    writeTestResult(fileContext, testUuid);
  }

  const scopeUuid = fileContext.scopes.pop();

  if (scopeUuid) {
    fileContext.allureRuntime.writeScope(scopeUuid);
  }

  test.completed = true;

  if (fileContext.currentTest === test) {
    fileContext.currentTest = undefined;
  }

  if (test.lastStatus !== Status.PASSED && test.attempt < test.retry) {
    fileContext.nextRetryTest = test;
  }

  advancePendingIndex(fileContext);
};

const onHookStart = (fileContext: BunFileContext, type: BunHookType) => {
  const scopeUuid = last(fileContext.scopes);
  const fixtureUuid = fileContext.allureRuntime.startFixture(scopeUuid, /after/i.test(type) ? "after" : "before", {
    name: type,
  });

  if (fixtureUuid) {
    fileContext.executables.push(fixtureUuid);
  }
};

const onHookSuccess = (fileContext: BunFileContext) => {
  const fixtureUuid = fileContext.executables.pop();

  if (!fixtureUuid) {
    return;
  }

  fileContext.allureRuntime.updateFixture(fixtureUuid, (allureResult) => {
    allureResult.status = Status.PASSED;
    allureResult.stage = Stage.FINISHED;
  });
  fileContext.allureRuntime.stopFixture(fixtureUuid);
};

const onHookFailure = (fileContext: BunFileContext, error: unknown) => {
  const fixtureUuid = fileContext.executables.pop();

  if (!fixtureUuid) {
    return;
  }

  const status = error instanceof Error ? getStatusFromError(error) : Status.BROKEN;
  const details = error instanceof Error ? getMessageAndTraceFromError(error) : { message: serialize(error) };

  fileContext.allureRuntime.updateFixture(fixtureUuid, (allureResult) => {
    allureResult.status = status;
    allureResult.statusDetails = details;
    allureResult.stage = Stage.FINISHED;
  });
  fileContext.allureRuntime.stopFixture(fixtureUuid);
};

const onTestSuccess = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = Status.PASSED;
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTestFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  const { status, details } = getStatusAndDetails(test.errors);

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = status;
    allureResult.statusDetails = { ...allureResult.statusDetails, ...details };
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTodoTestUnexpectedPass = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = Status.FAILED;
    allureResult.statusDetails = {
      ...allureResult.statusDetails,
      message: TODO_UNEXPECTED_PASS_MESSAGE,
    };
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTodoTestExpectedFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  const { details } = getStatusAndDetails(test.errors);

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = Status.SKIPPED;
    allureResult.statusDetails = {
      ...allureResult.statusDetails,
      ...details,
      message: details.message ? `${TODO_MESSAGE}: ${details.message}` : TODO_MESSAGE,
    };
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onFailingTestExpectedFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = Status.PASSED;
    allureResult.statusDetails = {};
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onFailingTestUnexpectedPass = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
    allureResult.stage = Stage.FINISHED;
    allureResult.status = Status.FAILED;
    allureResult.statusDetails = {
      ...allureResult.statusDetails,
      message: FAILING_UNEXPECTED_PASS_MESSAGE,
    };
  });
  fileContext.allureRuntime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

export const executeWrappedTest = async (
  deps: BunLifecycleDeps,
  fileContext: BunFileContext,
  test: BunRegisteredTest,
  originalFn: BunOriginalFn,
  args: any[],
) => {
  deps.activateFileContext(fileContext);
  ensureCurrentTest(deps, fileContext, test);

  try {
    const testResult = await originalFn(...args);
    test.duration = Date.now() - test.startedAt;

    switch (test.behavior) {
      case "todo":
        onTodoTestUnexpectedPass(fileContext, test);
        break;
      case "failing":
        onFailingTestUnexpectedPass(fileContext, test);
        break;
      default:
        onTestSuccess(fileContext, test);
        break;
    }

    return testResult;
  } catch (error) {
    test.duration = Date.now() - test.startedAt;
    test.errors = [adaptErrorForJestStatus(error)];

    switch (test.behavior) {
      case "todo":
        onTodoTestExpectedFailure(fileContext, test);
        break;
      case "failing":
        onFailingTestExpectedFailure(fileContext, test);
        break;
      default:
        onTestFailure(fileContext, test);
        break;
    }

    throw error;
  }
};

export const emitStaticTest = (deps: BunLifecycleDeps, fileContext: BunFileContext, test: BunRegisteredTest) => {
  if (test.resultEmitted || test.completed) {
    return;
  }

  deps.activateFileContext(fileContext);
  ensureRootScope(fileContext);
  transitionToSuite(fileContext, test.parent);

  fileContext.scopes.push(fileContext.allureRuntime.startScope());
  startAllureTest(fileContext, test);

  test.resultEmitted = true;

  const testUuid = fileContext.executables.pop();

  if (testUuid) {
    fileContext.allureRuntime.updateTest(testUuid, (allureResult) => {
      allureResult.stage = Stage.FINISHED;
      allureResult.status = Status.SKIPPED;

      if (test.mode === "todo") {
        allureResult.statusDetails = { ...allureResult.statusDetails, message: TODO_MESSAGE };
      }
    });
    fileContext.allureRuntime.stopTest(testUuid, { duration: 0 });
    writeTestResult(fileContext, testUuid);
  }

  const scopeUuid = fileContext.scopes.pop();

  if (scopeUuid) {
    fileContext.allureRuntime.writeScope(scopeUuid);
  }

  test.completed = true;
  advancePendingIndex(fileContext);
};

export const skipPendingTestsInSuite = (
  deps: BunLifecycleDeps,
  fileContext: BunFileContext,
  suite: BunDescribeBlock,
  error: unknown,
) => {
  const adaptedError = adaptErrorForJestStatus(error);

  for (const test of fileContext.tests) {
    if (test.started || test.completed || !isSuiteDescendantOf(test.parent, suite)) {
      continue;
    }

    startRegisteredTest(deps, fileContext, test);
    test.errors = [adaptedError];
    test.duration = 0;
    finalizeTest(fileContext, test);
  }
};

export const executeHook = async (
  deps: BunLifecycleDeps,
  fileContext: BunFileContext,
  suite: BunDescribeBlock,
  type: BunHookType,
  fn: BunOriginalFn,
  args: any[],
) => {
  deps.activateFileContext(fileContext);

  if ((type === "beforeAll" || type === "afterAll") && fileContext.testPlan && !suite.hasSelectedTests) {
    return;
  }

  if (type === "beforeAll" || type === "afterAll") {
    ensureRootScope(fileContext);
    transitionToSuite(fileContext, suite);
  } else if (type === "beforeEach") {
    ensureCurrentTest(deps, fileContext);
  }

  onHookStart(fileContext, type);

  try {
    const hookResult = await fn(...args);

    onHookSuccess(fileContext);

    return hookResult;
  } catch (error) {
    if (type === "beforeEach" && fileContext.currentTest) {
      fileContext.currentTest.errors = [adaptErrorForJestStatus(error)];
    }

    onHookFailure(fileContext, error);

    if (type === "beforeEach" && fileContext.currentTest) {
      finalizeTest(fileContext, fileContext.currentTest);
    }

    if (type === "afterEach" && fileContext.currentTest) {
      finalizeTest(fileContext, fileContext.currentTest);
    }

    if (type === "beforeAll") {
      skipPendingTestsInSuite(deps, fileContext, suite, error);
    }

    throw error;
  }
};

export const finishFileContext = (deps: BunLifecycleDeps, fileContext: BunFileContext) => {
  if (fileContext.runFinished) {
    return;
  }

  if (fileContext.currentTest && !fileContext.currentTest.completed) {
    finalizeTest(fileContext, fileContext.currentTest);
  }

  for (const test of fileContext.tests) {
    if (test.resultEmitted && !test.completed) {
      finalizeTest(fileContext, test);
    }
  }

  for (const test of fileContext.tests) {
    if (
      test.behavior === "todo" &&
      !test.started &&
      !test.resultEmitted &&
      isTestSelectedByBunNamePattern(fileContext, test)
    ) {
      emitStaticTest(deps, fileContext, test);
    }
  }

  while (fileContext.activeSuites.length > 0) {
    const scopeUuid = fileContext.scopes.pop();

    if (scopeUuid) {
      fileContext.allureRuntime.writeScope(scopeUuid);
    }

    fileContext.activeSuites.pop();
  }

  if (fileContext.rootScopeActive) {
    const scopeUuid = fileContext.scopes.pop();

    if (scopeUuid) {
      fileContext.allureRuntime.writeScope(scopeUuid);
    }

    fileContext.rootScopeActive = false;
  }

  writeRunMetadata(fileContext.runState, fileContext.allureRuntime);

  fileContext.runFinished = true;
};

export const finishRunState = (runState: BunRunState) => {
  writeRunMetadata(runState, runState.allureRuntime);
};
