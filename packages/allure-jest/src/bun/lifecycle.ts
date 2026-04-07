import { sep } from "node:path";

import { Stage, Status } from "allure-js-commons";
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

import { last } from "../utils.js";
import { FAILING_UNEXPECTED_PASS_MESSAGE, TODO_MESSAGE, TODO_UNEXPECTED_PASS_MESSAGE } from "./constants.js";
import { getRegisteredTestFullName, getSuiteNames, getSuitePath, isSuiteDescendantOf } from "./state.js";
import type { BunDescribeBlock, BunFileContext, BunHookType, BunOriginalFn, BunRegisteredTest } from "./types.js";

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

const startAllureTest = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const { runtime, testPath, scopes } = fileContext;
  const suitePath = getSuiteNames(test.parent);
  const fsPath = testPath.split(sep);
  const titlePath = fsPath.concat(suitePath);
  const { cleanTitle, labels, links } = extractMetadataFromString(test.name);
  const fullName = getRegisteredTestFullName(fileContext, test);

  const testUuid = runtime.startTest(
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
    },
    scopes,
  );

  fileContext.executables.push(testUuid);
};

export const ensureRootScope = (fileContext: BunFileContext) => {
  if (fileContext.rootScopeActive) {
    return;
  }

  fileContext.scopes.push(fileContext.runtime.startScope());
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
      fileContext.runtime.writeScope(scopeUuid);
    }
    fileContext.activeSuites.pop();
  }

  while (fileContext.activeSuites.length < targetPath.length) {
    fileContext.activeSuites.push(targetPath[fileContext.activeSuites.length]!);
    fileContext.scopes.push(fileContext.runtime.startScope());
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
  if (test.started) {
    return test;
  }

  claimNextPendingTest(fileContext, test);
  ensureRootScope(fileContext);
  transitionToSuite(fileContext, test.parent);
  deps.activateFileContext(fileContext);

  test.started = true;
  test.startedAt = Date.now();
  fileContext.currentTest = test;

  fileContext.scopes.push(fileContext.runtime.startScope());
  startAllureTest(fileContext, test);
  test.resultEmitted = true;

  return test;
};

export const ensureCurrentTest = (
  deps: BunLifecycleDeps,
  fileContext: BunFileContext,
  expected?: BunRegisteredTest,
) => {
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
    fileContext.runtime.updateTest(testUuid, (result) => {
      currentStatus = result.status;
    });

    if (currentStatus === undefined) {
      const { details } = getStatusAndDetails(test.errors);
      fileContext.runtime.updateTest(testUuid, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.SKIPPED;
        result.statusDetails = { ...result.statusDetails, ...details };
      });
      fileContext.runtime.stopTest(testUuid, { duration: 0 });
    }

    fileContext.runtime.writeTest(testUuid);
  }

  const scopeUuid = fileContext.scopes.pop();
  if (scopeUuid) {
    fileContext.runtime.writeScope(scopeUuid);
  }

  test.completed = true;

  if (fileContext.currentTest === test) {
    fileContext.currentTest = undefined;
  }

  advancePendingIndex(fileContext);
};

const onHookStart = (fileContext: BunFileContext, type: BunHookType) => {
  const scopeUuid = last(fileContext.scopes);
  const fixtureUuid = fileContext.runtime.startFixture(scopeUuid, /after/i.test(type) ? "after" : "before", {
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

  fileContext.runtime.updateFixture(fixtureUuid, (result) => {
    result.status = Status.PASSED;
    result.stage = Stage.FINISHED;
  });
  fileContext.runtime.stopFixture(fixtureUuid);
};

const onHookFailure = (fileContext: BunFileContext, error: unknown) => {
  const fixtureUuid = fileContext.executables.pop();

  if (!fixtureUuid) {
    return;
  }

  const status = error instanceof Error ? getStatusFromError(error) : Status.BROKEN;
  const details = error instanceof Error ? getMessageAndTraceFromError(error) : { message: serialize(error) };

  fileContext.runtime.updateFixture(fixtureUuid, (result) => {
    result.status = status;
    result.statusDetails = details;
    result.stage = Stage.FINISHED;
  });
  fileContext.runtime.stopFixture(fixtureUuid);
};

const onTestSuccess = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = Status.PASSED;
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTestFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  const { status, details } = getStatusAndDetails(test.errors);

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = status;
    result.statusDetails = { ...result.statusDetails, ...details };
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTodoTestUnexpectedPass = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = Status.FAILED;
    result.statusDetails = {
      ...result.statusDetails,
      message: TODO_UNEXPECTED_PASS_MESSAGE,
    };
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onTodoTestExpectedFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  const { details } = getStatusAndDetails(test.errors);

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = Status.SKIPPED;
    result.statusDetails = {
      ...result.statusDetails,
      ...details,
      message: details.message ? `${TODO_MESSAGE}: ${details.message}` : TODO_MESSAGE,
    };
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onFailingTestExpectedFailure = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = Status.PASSED;
    result.statusDetails = {};
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
};

const onFailingTestUnexpectedPass = (fileContext: BunFileContext, test: BunRegisteredTest) => {
  const testUuid = last(fileContext.executables);

  if (!testUuid) {
    return;
  }

  fileContext.runtime.updateTest(testUuid, (result) => {
    result.stage = Stage.FINISHED;
    result.status = Status.FAILED;
    result.statusDetails = {
      ...result.statusDetails,
      message: FAILING_UNEXPECTED_PASS_MESSAGE,
    };
  });
  fileContext.runtime.stopTest(testUuid, { duration: test.duration ?? 0 });
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
    const result = await originalFn(...args);
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

    return result;
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

  fileContext.scopes.push(fileContext.runtime.startScope());
  startAllureTest(fileContext, test);
  test.resultEmitted = true;
  const testUuid = fileContext.executables.pop();

  if (testUuid) {
    fileContext.runtime.updateTest(testUuid, (result) => {
      result.stage = Stage.FINISHED;
      result.status = Status.SKIPPED;

      if (test.mode === "todo") {
        result.statusDetails = { ...result.statusDetails, message: TODO_MESSAGE };
      }
    });
    fileContext.runtime.stopTest(testUuid, { duration: 0 });
    fileContext.runtime.writeTest(testUuid);
  }

  const scopeUuid = fileContext.scopes.pop();
  if (scopeUuid) {
    fileContext.runtime.writeScope(scopeUuid);
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
    const result = await fn(...args);
    onHookSuccess(fileContext);
    return result;
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
    if (test.behavior === "todo" && !test.started && !test.resultEmitted) {
      emitStaticTest(deps, fileContext, test);
    }
  }

  while (fileContext.activeSuites.length > 0) {
    const scopeUuid = fileContext.scopes.pop();
    if (scopeUuid) {
      fileContext.runtime.writeScope(scopeUuid);
    }
    fileContext.activeSuites.pop();
  }

  if (fileContext.rootScopeActive) {
    const scopeUuid = fileContext.scopes.pop();
    if (scopeUuid) {
      fileContext.runtime.writeScope(scopeUuid);
    }
    fileContext.rootScopeActive = false;
  }

  if (!fileContext.runState.environmentInfoWritten && fileContext.runtime.environmentInfo !== undefined) {
    fileContext.runtime.writeEnvironmentInfo();
    fileContext.runState.environmentInfoWritten = true;
  }

  if (!fileContext.runState.categoriesWritten && fileContext.runtime.categories !== undefined) {
    fileContext.runtime.writeCategoriesDefinitions();
    fileContext.runState.categoriesWritten = true;
  }
  fileContext.runFinished = true;
};
