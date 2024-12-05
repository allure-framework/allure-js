import { ContentType, Status } from "allure-js-commons";
import type { StatusDetails } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { CypressFailMessage, CypressHook, CypressSuite, CypressTest, StepDescriptor } from "../types.js";
import { getTestRuntime } from "./runtime.js";
import { dropCurrentTest, enqueueRuntimeMessage, getCurrentTest, setCurrentTest } from "./state.js";
import { finalizeSteps, stopAllSteps } from "./steps.js";
import {
  getStatusDataOfTestSkippedByHookError,
  getStepStopData,
  getSuitePath,
  getTestSkipData,
  getTestStartData,
  getTestStopData,
  isAllureHook,
  isLastRootAfterHook,
  isTestReported,
  iterateTests,
  markTestAsReported,
} from "./utils.js";

export const reportRunStart = () => {
  enqueueRuntimeMessage({
    type: "cypress_run_start",
    data: {},
  });
};

export const reportSuiteStart = (suite: CypressSuite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_start",
    data: {
      id: suite.id,
      name: suite.title,
      root: suite.root,
      start: Date.now(),
    },
  });
};

export const reportSuiteEnd = (suite: CypressSuite) => {
  enqueueRuntimeMessage({
    type: "cypress_suite_end",
    data: {
      root: suite.root,
      stop: Date.now(),
    },
  });
};

export const reportHookStart = (hook: CypressHook, start?: number) => {
  enqueueRuntimeMessage({
    type: "cypress_hook_start",
    data: {
      name: hook.title,
      scopeType: hook.hookName.includes("each") ? "each" : "all",
      position: hook.hookName.includes("before") ? "before" : "after",
      start: start ?? Date.now(),
    },
  });
};

export const reportHookEnd = (hook: CypressHook) => {
  finalizeSteps();
  enqueueRuntimeMessage({
    type: "cypress_hook_end",
    data: {
      duration: hook.duration ?? 0,
    },
  });
};

export const reportTestStart = (test: CypressTest) => {
  setCurrentTest(test);
  enqueueRuntimeMessage({
    type: "cypress_test_start",
    data: getTestStartData(test),
  });
  markTestAsReported(test);
};

export const reportStepStart = (id: string, name: string) => {
  enqueueRuntimeMessage({
    type: "cypress_step_start",
    data: {
      id,
      name,
      start: Date.now(),
    },
  });
};

export const reportStepStop = (step: StepDescriptor, status?: Status, statusDetails?: StatusDetails) => {
  enqueueRuntimeMessage({
    type: "cypress_step_stop",
    data: getStepStopData(step, status, statusDetails),
  });
};

export const reportTestPass = () => {
  enqueueRuntimeMessage({
    type: "cypress_test_pass",
    data: {},
  });
};

export const reportTestOrHookFail = (err: Error) => {
  const status = getStatusFromError(err);
  const statusDetails = getMessageAndTraceFromError(err);

  stopAllSteps(status, statusDetails);

  enqueueRuntimeMessage({
    type: "cypress_fail",
    data: {
      status,
      statusDetails,
    },
  });
};

export const completeHookErrorReporting = (hook: CypressHook, err: Error) => {
  const isEachHook = hook.hookName.includes("each");
  const suite = hook.parent!;
  const testFailData = getStatusDataOfTestSkippedByHookError(hook.title, isEachHook, err, suite);

  // Cypress doens't emit 'hook end' if the hook has failed.
  reportHookEnd(hook);

  // Cypress doens't emit 'test end' if the hook has failed.
  // We must report the test's end manualy in case of a 'before each' hook.
  reportCurrentTestIfAny();

  // Cypress skips the remaining tests in the suite of a failed hook.
  // We should include them to the report manually.
  reportRemainingTests(suite, testFailData);
};

export const reportTestSkip = (test: CypressTest) => {
  if (isTestReported(test)) {
    stopAllSteps(Status.SKIPPED, {
      message: "The test was skipped before the command was completed",
    });
  } else {
    reportTestStart(test);
  }

  enqueueRuntimeMessage({
    type: "cypress_test_skip",
    data: getTestSkipData(),
  });
};

export const reportTestEnd = (test: CypressTest) => {
  finalizeSteps();
  enqueueRuntimeMessage({
    type: "cypress_test_end",
    data: {
      duration: test.duration ?? 0,
      retries: (test as any)._retries ?? 0,
    },
  });
  dropCurrentTest();
};

export const reportScreenshot = (path: string, name: string) => {
  enqueueRuntimeMessage({
    type: "attachment_path",
    data: { path, name, contentType: ContentType.PNG },
  });
};

export const completeSpecIfNoAfterHookLeft = (context: Mocha.Context) => {
  if (isLastRootAfterHook(context)) {
    const hook = context.test as CypressHook;
    if (!isAllureHook(hook)) {
      reportHookEnd(hook);
    }
    return completeSpecAsync();
  }
};

export const completeSpecOnAfterHookFailure = (
  context: Mocha.Context,
  hookError: Error,
): Cypress.Chainable<unknown> | undefined => {
  try {
    reportTestOrHookFail(hookError);
    completeHookErrorReporting(context.test as CypressHook, hookError);

    // cy.task's then doesn't have onrejected, that's why we don't log async Allure errors here.
    return completeSpecAsync();
  } catch (allureError) {
    logAllureRootAfterError(context, allureError);
  }
};

export const throwAfterSpecCompletion = (context: Mocha.Context, err: any) => {
  const chain = completeSpecOnAfterHookFailure(context, err as Error)?.then(() => {
    throw err;
  });
  if (!chain) {
    throw err;
  }
};

export const flushRuntimeMessages = () => getTestRuntime().flushAllureMessagesToTask("reportAllureCypressSpecMessages");

export const completeSpecAsync = () =>
  getTestRuntime().flushAllureMessagesToTaskAsync("reportFinalAllureCypressSpecMessages");

const reportCurrentTestIfAny = () => {
  const currentTest = getCurrentTest();
  if (currentTest) {
    reportTestEnd(currentTest);
  }
};

const reportRemainingTests = (suite: CypressSuite, testFailData: CypressFailMessage["data"]) => {
  for (const test of iterateTests(suite)) {
    // Some tests in the suite might've been already reported.
    if (!isTestReported(test)) {
      reportTestsSkippedByHookError(
        test,
        test.pending ? { ...getTestSkipData(), status: Status.SKIPPED } : testFailData,
      );
    }
  }
};

const reportTestsSkippedByHookError = (test: CypressTest, testFailData: CypressFailMessage["data"]) => {
  enqueueRuntimeMessage({
    type: "cypress_skipped_test",
    data: {
      ...getTestStartData(test),
      ...testFailData,
      ...getTestStopData(test),
      suites: getSuitePath(test).map((s) => s.id),
    },
  });
  markTestAsReported(test);
};

const logAllureRootAfterError = (context: Mocha.Context, err: unknown) => {
  // We play safe and swallow errors here to keep the original 'after all' error.
  try {
    // eslint-disable-next-line no-console
    console.error(`Unexpected error when reporting the failure of ${context.test?.title ?? "'after all'"}`);
    // eslint-disable-next-line no-console
    console.error(err);
  } catch {}
};
