import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type { CypressCommand, CypressHook, CypressTest } from "./model.js";
import { ALLURE_REPORT_SYSTEM_HOOK } from "./model.js";
import {
  enableScopeLevelAfterHookReporting,
  flushFinalRuntimeMessages,
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
import { applyTestPlan, isTestReported, shouldCommandBeSkipped } from "./utils.js";

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
  EVENT_RUN_END,
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
    .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
      if (!suite.parent) {
        applyTestPlan(Cypress.spec, suite);
      }
      reportSuiteStart(suite);
    })
    .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
      reportSuiteEnd(suite);
    })
    .on(EVENT_HOOK_BEGIN, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SYSTEM_HOOK)) {
        return;
      }

      reportHookStart(hook);
    })
    .on(EVENT_HOOK_END, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SYSTEM_HOOK)) {
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
    .on(EVENT_TEST_FAIL, (_: CypressTest, err: Error) => {
      reportTestOrHookFail(err);
    })
    .on(EVENT_TEST_PENDING, (test: CypressTest) => {
      reportTestSkip(test);
    })
    .on(EVENT_TEST_END, (test: CypressTest) => {
      reportTestEnd(test);
    })
    .on(EVENT_RUN_END, () => {
      // after:spec isn't called in interactive mode by default.
      // We're using the 'end' event instead to report the remaining messages
      // (the root 'suite end', mainly).
      if (Cypress.config("isInteractive")) {
        flushFinalRuntimeMessages();
      }
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

  afterEach(ALLURE_REPORT_SYSTEM_HOOK, () => {
    flushRuntimeMessages();
  });
  after(ALLURE_REPORT_SYSTEM_HOOK, () => {
    flushRuntimeMessages();
  });

  enableScopeLevelAfterHookReporting();
};

initializeAllure();

export * from "allure-js-commons";
