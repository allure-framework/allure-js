import type { CypressHook, CypressSuite, CypressTest } from "../../types.js";
import {
  completeHookErrorReporting,
  completeSpecIfNoAfterHookLeft,
  flushRuntimeMessages,
  reportTestPass as onPass,
  reportTestSkip as onPending,
  reportSuiteEnd as onSuiteEnd,
  reportTestEnd as onTestEnd,
  reportHookEnd,
  reportHookStart,
  reportRunStart,
  reportSuiteStart,
  reportTestOrHookFail,
  reportTestStart,
} from "../lifecycle.js";
import { initTestRuntime } from "../runtime.js";
import { applyTestPlan } from "../testplan.js";
import { isAllureHook, isRootAfterAllHook, isTestReported } from "../utils.js";

export const ALLURE_REPORT_SYSTEM_HOOK = "__allure_report_system_hook__";

export const registerMochaEventListeners = () => {
  ((Cypress as any).mocha.getRunner() as Mocha.Runner)
    .on("start", onStart)
    .on("suite", onSuite)
    .on("suite end", onSuiteEnd)
    .on("hook", onHook)
    .on("hook end", onHookEnd)
    .on("test", onTest)
    .on("pass", onPass)
    .on("fail", onFail)
    .on("pending", onPending)
    .on("test end", onTestEnd);
};

export const injectFlushMessageHooks = () => {
  afterEach(ALLURE_REPORT_SYSTEM_HOOK, flushRuntimeMessages);
  after(ALLURE_REPORT_SYSTEM_HOOK, onAfterAll);
};

const onStart = () => {
  initTestRuntime();
  reportRunStart();
};

const onSuite = (suite: CypressSuite) => {
  if (suite.root) {
    applyTestPlan(Cypress.spec, suite);
  }
  reportSuiteStart(suite);
};

const onHook = (hook: CypressHook) => {
  if (isAllureHook(hook)) {
    return;
  }

  reportHookStart(hook);
};

const onHookEnd = (hook: CypressHook) => {
  if (isAllureHook(hook)) {
    return;
  }

  reportHookEnd(hook);
};

const onTest = (test: CypressTest) => {
  // Cypress emits an extra EVENT_TEST_BEGIN if the test is skipped.
  // reportTestSkip does that already, so we need to filter the extra event out.
  if (!isTestReported(test)) {
    reportTestStart(test);
  }
};

const onFail = (testOrHook: CypressTest | CypressHook, err: Error) => {
  const isHook = "hookName" in testOrHook;
  if (isHook && isRootAfterAllHook(testOrHook)) {
    // Errors in spec-level 'after all' hooks are handled by Allure wrappers.
    return;
  }

  const isAllureHookFailure = isHook && isAllureHook(testOrHook);

  if (isAllureHookFailure) {
    // Normally, Allure hooks are skipped from the report.
    // In case of errors, it will be helpful to see them.
    reportHookStart(testOrHook, Date.now() - (testOrHook.duration ?? 0));
  }

  // This will mark the fixture and the test (if any) as failed/broken.
  reportTestOrHookFail(err);

  if (isHook) {
    // This will end the fixture and test (if any) and will report the remaining
    // tests in the hook's suite (the ones that will be skipped by Cypress/Mocha).
    completeHookErrorReporting(testOrHook, err);
  }
};

const onAfterAll = function (this: Mocha.Context) {
  flushRuntimeMessages();
  completeSpecIfNoAfterHookLeft(this);
};
