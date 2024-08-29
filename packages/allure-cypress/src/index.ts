import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import { ALLURE_REPORT_SYSTEM_HOOK } from "./model.js";
import type { CypressCommand, CypressHook, CypressSuite, CypressTest } from "./model.js";
import {
  completeHookErrorReporting,
  completeSpecIfNoAfterHookLeft,
  enableScopeLevelAfterHookReporting,
  flushRuntimeMessages,
  initTestRuntime,
  reportCommandEnd,
  reportCommandStart,
  reportHookEnd,
  reportHookStart,
  reportRunStart,
  reportScreenshot,
  reportSuiteEnd,
  reportSuiteStart,
  reportTestEnd,
  reportTestOrHookFail,
  reportTestPass,
  reportTestSkip,
  reportTestStart,
  reportUnfinishedSteps,
} from "./runtime.js";
import { isAllureInitialized, setAllureInitialized } from "./state.js";
import { applyTestPlan, isAllureHook, isRootAfterAllHook, isTestReported, shouldCommandBeSkipped } from "./utils.js";

const {
  EVENT_RUN_BEGIN,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_PASS,
  EVENT_TEST_FAIL,
  EVENT_TEST_PENDING,
  EVENT_TEST_END,
} = Mocha.Runner.constants;

const initializeAllure = () => {
  if (isAllureInitialized()) {
    return;
  }

  setAllureInitialized();

  // @ts-ignore
  Cypress.mocha
    .getRunner()
    .on(EVENT_RUN_BEGIN, () => {
      initTestRuntime();
      reportRunStart();
    })
    .on(EVENT_SUITE_BEGIN, (suite: CypressSuite) => {
      if (suite.root) {
        applyTestPlan(Cypress.spec, suite);
      }
      reportSuiteStart(suite);
    })
    .on(EVENT_SUITE_END, (suite: CypressSuite) => {
      reportSuiteEnd(suite);
    })
    .on(EVENT_HOOK_BEGIN, (hook: CypressHook) => {
      if (isAllureHook(hook)) {
        return;
      }

      reportHookStart(hook);
    })
    .on(EVENT_HOOK_END, (hook: CypressHook) => {
      if (isAllureHook(hook)) {
        return;
      }

      reportHookEnd(hook);
    })
    .on(EVENT_TEST_BEGIN, (test: CypressTest) => {
      // Cypress emits an extra EVENT_TEST_BEGIN if the test is skipped.
      // reportTestSkip does that already, so we need to filter the extra event out.
      if (!isTestReported(test)) {
        reportTestStart(test);
      }
    })
    .on(EVENT_TEST_PASS, () => {
      reportTestPass();
    })
    .on(EVENT_TEST_FAIL, (testOrHook: CypressTest | CypressHook, err: Error) => {
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
    })
    .on(EVENT_TEST_PENDING, (test: CypressTest) => {
      reportTestSkip(test);
    })
    .on(EVENT_TEST_END, (test: CypressTest) => {
      reportTestEnd(test);
    });

  Cypress.Screenshot.defaults({
    onAfterScreenshot: (_, { path, name }) => {
      reportScreenshot(path, name);
    },
  });

  Cypress.on("fail", (err) => {
    const status = getStatusFromError(err);
    const statusDetails = getMessageAndTraceFromError(err);

    reportUnfinishedSteps(status, statusDetails);

    throw err;
  });
  Cypress.on("command:start", (command: CypressCommand) => {
    if (shouldCommandBeSkipped(command)) {
      return;
    }

    reportCommandStart(command);
  });
  Cypress.on("command:end", (command: CypressCommand) => {
    if (shouldCommandBeSkipped(command)) {
      return;
    }

    reportCommandEnd();
  });

  afterEach(ALLURE_REPORT_SYSTEM_HOOK, flushRuntimeMessages);

  after(ALLURE_REPORT_SYSTEM_HOOK, function (this: Mocha.Context) {
    flushRuntimeMessages();
    completeSpecIfNoAfterHookLeft(this);
  });

  enableScopeLevelAfterHookReporting();
};

initializeAllure();

export * from "allure-js-commons";
