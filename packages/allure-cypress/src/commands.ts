import {
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
  getUnfinishedStepsMessages,
  hasStepMessage,
  setGlobalTestRuntime,
  getGlobalTestRuntime,
} from "allure-js-commons/new/sdk/browser";
import { CypressRuntimeMessage } from "./model.js";

export class AllureCypressTestRuntime implements TestRuntime {
  sendMessage(message: CypressRuntimeMessage) {
    const messages = Cypress.env("allureRuntimeMessages") || [];

    Cypress.env("allureRuntimeMessages", messages.concat(message));
  }
}

const { EVENT_TEST_BEGIN, EVENT_TEST_FAIL, EVENT_TEST_PASS } = Mocha.Runner.constants;

const getSuitePath = (test: Mocha.Test): string[] => {
  const path: string[] = [];
  let currentSuite: Mocha.Suite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};

// @ts-ignore
Cypress.mocha
  .getRunner()
  .on(EVENT_TEST_BEGIN, (test: Mocha.Test) => {
    const testRuntime = new AllureCypressTestRuntime();

    Cypress.env("allureRuntimeMessages", []);

    testRuntime.sendMessage({
      type: "cypress_start",
      data: {
        isInteractive: Cypress.config("isInteractive"),
        absolutePath: Cypress.spec.absolute,
        specPath: getSuitePath(test).concat(test.title),
        filename: Cypress.spec.relative,
        start: Date.now(),
      },
    });

    setGlobalTestRuntime(testRuntime);
  })
  .on(EVENT_TEST_PASS, () => {
    const testRuntime = getGlobalTestRuntime();
    const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
    const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

    unfinishedStepsMessages.forEach(() => {
      testRuntime.sendMessage({
        type: "step_stop",
        data: {
          stage: Stage.FINISHED,
          status: Status.PASSED,
          stop: Date.now(),
        },
      });
    });
    testRuntime.sendMessage({
      type: "cypress_end",
      data: {
        stage: Stage.FINISHED,
        status: Status.PASSED,
        stop: Date.now(),
      },
    });
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    const testRuntime = getGlobalTestRuntime();

    testRuntime.sendMessage({
      type: "cypress_end",
      data: {
        stage: Stage.FINISHED,
        status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
        statusDetails: {
          message: err.message,
          trace: err.stack,
        },
        stop: Date.now(),
      },
    });
  });

Cypress.Screenshot.defaults({
  onAfterScreenshot: (_, details) => {
    const testRuntime = getGlobalTestRuntime();

    testRuntime.sendMessage({
      type: "cypress_screenshot",
      data: {
        path: details.path,
        name: details.name || "Screenshot",
      },
    });
  },
});
Cypress.on("fail", (err) => {
  const testRuntime = getGlobalTestRuntime();
  const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];
  const hasSteps = hasStepMessage(runtimeMessages as RuntimeMessage[]);

  // if there is no steps, don't handle the error
  if (!hasSteps) {
    throw err;
  }

  const unfinishedStepsMessages = getUnfinishedStepsMessages(runtimeMessages as RuntimeMessage[]);

  if (unfinishedStepsMessages.length === 0) {
    throw err;
  }

  const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

  unfinishedStepsMessages.forEach(() => {
    testRuntime.sendMessage({
      type: "step_stop",
      data: {
        stage: Stage.FINISHED,
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

afterEach(() => {
  const runtimeMessages = Cypress.env("allureRuntimeMessages") as CypressRuntimeMessage[];

  cy.task("allureReportTest", runtimeMessages, { log: false });
});
