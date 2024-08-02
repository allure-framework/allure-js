import type { StatusDetails } from "allure-js-commons";
import { ContentType, Status } from "allure-js-commons";
import type { RuntimeMessage, TestPlanV1 } from "allure-js-commons/sdk";
import { getUnfinishedStepsMessages, hasStepMessage } from "allure-js-commons/sdk";
import type {
  CypressCommand,
  CypressCommandStartMessage,
  CypressHook,
  CypressHookStartMessage,
  CypressTest,
  CypressTestStartMessage,
} from "./model.js";
import { ALLURE_REPORT_SYSTEM_HOOK } from "./model.js";
import {
  getHookType,
  getSuitePath,
  shouldCommandBeSkipped,
  isGlobalHook,
  isTestPresentInTestPlan,
  toReversed,
} from "./utils.js";
import { enqueueRuntimeMessages, getTestRuntime, initTestRuntime, reportRuntimeMessages } from "./runtime.js";

const {
  EVENT_RUN_BEGIN,
  EVENT_RUN_END,
  EVENT_TEST_BEGIN,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
} = Mocha.Runner.constants;

const initializeAllure = () => {
  const initialized = Cypress.env("allureInitialized") as boolean;

  if (initialized) {
    return;
  }

  Cypress.env("allureInitialized", true);

  // @ts-ignore
  Cypress.mocha
    .getRunner()
    .on(EVENT_RUN_BEGIN, () => {
      initTestRuntime();
    })
    .on(EVENT_HOOK_BEGIN, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SYSTEM_HOOK)) {
        return;
      }

      // @ts-ignore
      const testId: string | undefined = Cypress.state()?.test?.id;

      enqueueRuntimeMessages({
        type: "cypress_hook_start",
        data: {
          id: testId ? `${testId}:${hook.hookId}` : "",
          parentId: hook.parent.id,
          name: hook.title,
          type: getHookType(hook.title),
          start: Date.now(),
          global: isGlobalHook(hook.title),
        },
      });
    })
    .on(EVENT_HOOK_END, (hook: CypressHook) => {
      if (hook.title.includes(ALLURE_REPORT_SYSTEM_HOOK)) {
        return;
      }

      const testRuntime = getTestRuntime();
      const runtimeMessages = testRuntime.messages();
      const hookStartMessage = toReversed(runtimeMessages).find(
        ({ type }) => type === "cypress_hook_start",
      ) as CypressHookStartMessage;

      if (!hookStartMessage.data.id) {
        hookStartMessage.data.id = `${hook.id}:${hook.hookId}`;
      }

      testRuntime.enqueueMessage({
        type: "cypress_hook_end",
        data: {
          id: hookStartMessage.data.id,
          parentId: hook.parent.id,
          status: Status.PASSED,
          stop: hookStartMessage.data.start + (hook.duration ?? 0),
          global: isGlobalHook(hook.title),
        },
      });
    })
    .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
      enqueueRuntimeMessages({
        type: "cypress_suite_start",
        data: {
          id: suite.titlePath().join(" "),
          name: suite.title,
        },
      });
    })
    .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
      enqueueRuntimeMessages({
        type: "cypress_suite_end",
        data: {
          id: suite.titlePath().join(" "),
        },
      });
    })
    .on(EVENT_TEST_BEGIN, (test: CypressTest) => {
      enqueueRuntimeMessages({
        type: "cypress_test_start",
        data: {
          id: test.id,
          specPath: getSuitePath(test).concat(test.title),
          filename: Cypress.spec.relative,
          start: test.wallClockStartedAt?.getTime() || Date.now(),
        },
      });
    })
    .on(EVENT_TEST_PASS, (test: CypressTest) => {
      const testRuntime = getTestRuntime();
      const runtimeMessages = testRuntime.messages() as RuntimeMessage[];
      const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages);
      // @ts-ignore
      const retries = test._retries ?? 0;

      unfinishedStepsMessages.forEach(() => {
        testRuntime.enqueueMessage({
          type: "step_stop",
          data: {
            status: Status.PASSED,
            stop: Date.now(),
          },
        });
      });

      testRuntime.enqueueMessage({
        type: "cypress_test_end",
        data: {
          id: test.id,
          status: Status.PASSED,
          stop: Date.now(),
          retries,
        },
      });
    })
    .on(EVENT_TEST_FAIL, (test: CypressTest, err: Error) => {
      const testRuntime = getTestRuntime();
      const runtimeMessages = testRuntime.messages();
      const startCommandMessageIdx = runtimeMessages
        .toReversed()
        .findIndex(({ type }) => type === "cypress_command_start");
      const stopCommandMessageIdx = runtimeMessages
        .toReversed()
        .findIndex(({ type }) => type === "cypress_command_end");
      const hasUnfinishedCommand = startCommandMessageIdx > stopCommandMessageIdx;
      const status = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;
      const statusDetails: StatusDetails = {
        message: err.message,
        trace: err.stack,
      };
      // @ts-ignore
      const retries = test._retries ?? 0;

      if (hasUnfinishedCommand) {
        testRuntime.enqueueMessage({
          type: "cypress_command_end",
          data: {
            id: (runtimeMessages[startCommandMessageIdx] as CypressCommandStartMessage).data.id,
            status,
            statusDetails,
          },
        });
      }

      if (test.hookName) {
        const hookStartMessage = runtimeMessages
          .toReversed()
          .find(({ type }) => type === "cypress_hook_start") as CypressHookStartMessage;

        testRuntime.enqueueMessage({
          type: "cypress_hook_end",
          data: {
            id: hookStartMessage.data.id,
            status,
            statusDetails,
            stop: hookStartMessage.data.start + (test.duration ?? 0),
            parentId: hookStartMessage.data.parentId,
            global: isGlobalHook(test.hookName),
          },
        });
      }

      // the test hasn't been even started (rather due to hook error), so we need to start it manually
      if (!test.hookName && test.wallClockStartedAt === undefined) {
        testRuntime.enqueueMessage({
          type: "cypress_test_start",
          data: {
            id: test.id,
            specPath: getSuitePath(test).concat(test.title),
            filename: Cypress.spec.relative,
            start: Date.now(),
          },
        });
      }

      const testStartMessage = toReversed(runtimeMessages).find(
        ({ type }) => type === "cypress_test_start",
      ) as CypressTestStartMessage;

      testRuntime.enqueueMessage({
        type: "cypress_test_end",
        data: {
          id: test.id,
          status,
          statusDetails,
          stop: testStartMessage.data.start + (test.duration ?? 0),
          retries,
        },
      });
    })
    .on(EVENT_TEST_PENDING, (test: CypressTest) => {
      const testRuntime = getTestRuntime();
      const testPlan = Cypress.env("allureTestPlan") as TestPlanV1;

      if (testPlan && !isTestPresentInTestPlan(Cypress.currentTest, Cypress.spec, testPlan)) {
        return;
      }

      // @ts-ignore
      const retries = test._retries ?? 0;

      testRuntime.enqueueMessage({
        type: "cypress_test_start",
        data: {
          id: test.id,
          specPath: getSuitePath(test).concat(test.title),
          filename: Cypress.spec.relative,
          start: Date.now(),
        },
      });

      testRuntime.enqueueMessage({
        type: "cypress_test_end",
        data: {
          id: test.id,
          status: Status.SKIPPED,
          stop: Date.now(),
          retries,
        },
      });
    })
    .on(EVENT_RUN_END, () => {
      // this is the only way to say reporter process messages in interactive mode without data duplication
      if (Cypress.config("isInteractive")) {
        cy.task("allureReportSpec", { absolute: Cypress.spec.absolute });
      }
    });

  Cypress.Screenshot.defaults({
    onAfterScreenshot: (_, details) => {
      enqueueRuntimeMessages({
        type: "attachment_path",
        data: {
          path: details.path,
          name: details.name || "Screenshot",
          contentType: ContentType.PNG,
        },
      });
    },
  });

  Cypress.on("fail", (err) => {
    const testRuntime = getTestRuntime();
    const runtimeMessages = testRuntime.messages() as RuntimeMessage[];
    const hasSteps = hasStepMessage(runtimeMessages);

    // if there is no steps, don't handle the error
    if (!hasSteps) {
      throw err;
    }

    const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages);

    if (unfinishedStepsMessages.length === 0) {
      throw err;
    }

    const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

    unfinishedStepsMessages.forEach(() => {
      testRuntime.enqueueMessage({
        type: "step_stop",
        data: {
          status: failedStepsStatus,
          stop: Date.now(),
          statusDetails: {
            message: err.message,
            trace: err.stack,
          },
        },
      });
    });

    throw err;
  });
  Cypress.on("command:start", (command: CypressCommand) => {
    if (shouldCommandBeSkipped(command)) {
      return;
    }

    enqueueRuntimeMessages({
      type: "cypress_command_start",
      data: {
        id: command.attributes.id,
        name: `Command "${command.attributes.name}"`,
        args: command.attributes.args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg, null, 2))),
      },
    });
  });
  Cypress.on("command:end", (command: CypressCommand) => {
    if (shouldCommandBeSkipped(command)) {
      return;
    }

    enqueueRuntimeMessages({
      type: "cypress_command_end",
      data: {
        id: command.attributes.id,
        status: Status.PASSED,
      },
    });
  });

  before(ALLURE_REPORT_SYSTEM_HOOK, () => {
    cy.task("readAllureTestPlan", {}, { log: false }).then((testPlan) => {
      if (!testPlan) {
        return;
      }

      Cypress.env("allureTestPlan", testPlan);
    });
  });

  beforeEach(ALLURE_REPORT_SYSTEM_HOOK, function () {
    const testPlan = Cypress.env("allureTestPlan") as TestPlanV1;

    if (!testPlan) {
      return;
    }

    if (!isTestPresentInTestPlan(Cypress.currentTest, Cypress.spec, testPlan)) {
      this.skip();
    }
  });

  after(ALLURE_REPORT_SYSTEM_HOOK, () => {
    reportRuntimeMessages();
  });
};

initializeAllure();

export * from "allure-js-commons";
