import { Stage, Status } from "allure-js-commons/new";
import { MessageType, type ReportFinalMessage, type ReporterMessage } from "./model";

const createFinalMesage = (testFileAbsolutePath: string) =>
  // @ts-ignore
  ({
    startMessage: undefined,
    endMessage: undefined,
    messages: [],
    testFileAbsolutePath,
  }) as ReportFinalMessage;

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
const getStepsMessagesPair = (reportMessage: ReportFinalMessage) =>
  reportMessage.messages.reduce((acc, message) => {
    if (message.type !== MessageType.STEP_STARTED && message.type !== MessageType.STEP_ENDED) {
      return acc;
    }

    if (message.type === MessageType.STEP_STARTED) {
      acc.push([message]);

      return acc;
    }

    const unfinishedStepIdx = acc.findLastIndex((step) => step.length === 1);

    if (unfinishedStepIdx === -1) {
      return acc;
    }

    acc[unfinishedStepIdx].push(message);

    return acc;
  }, [] as ReporterMessage[][]);

// @ts-ignore
Cypress.mocha
  .getRunner()
  .on(EVENT_TEST_BEGIN, (test: Mocha.Test) => {
    const reportMessage = createFinalMesage(Cypress.spec.absolute);

    reportMessage.startMessage = {
      specPath: getSuitePath(test).concat(test.title),
      filename: Cypress.spec.relative,
      start: Date.now(),
    };

    Cypress.env("allure", { reportMessage });
  })
  .on(EVENT_TEST_PASS, () => {
    const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;
    const grouppedStepsMessage = getStepsMessagesPair(reportMessage);
    const unfinishedStepsMessages = grouppedStepsMessage.filter((step) => step.length === 1);

    unfinishedStepsMessages.forEach(() => {
      reportMessage.messages.push({
        type: MessageType.STEP_ENDED,
        payload: {
          stage: Stage.FINISHED,
          status: Status.PASSED,
          stop: Date.now(),
        },
      });
    });
    reportMessage.endMessage = {
      stage: Stage.FINISHED,
      status: Status.PASSED,
      stop: Date.now(),
    };

    Cypress.env("allure", { reportMessage });
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;

    reportMessage.endMessage = {
      stage: Stage.FINISHED,
      status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
      statusDetails: {
        message: err.message,
        trace: err.stack,
      },
      stop: Date.now(),
    };

    Cypress.env("allure", { reportMessage });
  });

Cypress.Screenshot.defaults({
  onAfterScreenshot: (_, details) => {
    const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;

    reportMessage.messages.push({
      type: MessageType.SCREENSHOT,
      payload: {
        path: details.path,
        name: details.name || "Screenshot",
      },
    });

    Cypress.env("allure", { reportMessage });
  },
});
Cypress.on("fail", (err) => {
  const reportMessage: ReportFinalMessage = Cypress.env("allure").reportMessage;
  const hasSteps = reportMessage.messages.some((message) => message.type === MessageType.STEP_STARTED);

  // if there is no steps, don't handle the error
  if (!hasSteps) {
    throw err;
  }

  const grouppedStepsMessage = getStepsMessagesPair(reportMessage);
  const unfinishedStepsMessages = grouppedStepsMessage.filter((step) => step.length === 1);

  if (unfinishedStepsMessages.length === 0) {
    throw err;
  }

  const failedStepsStatus = err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

  unfinishedStepsMessages.forEach(() => {
    reportMessage.messages.push({
      type: MessageType.STEP_ENDED,
      payload: {
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

  Cypress.env("allure", { reportMessage });

  throw err;
});

afterEach(() => {
  const reportMessage = Cypress.env("allure").reportMessage;

  cy.task("allureReportTest", reportMessage, { log: false });
});
