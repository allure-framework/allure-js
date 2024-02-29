import { MessageType, type ReportFinalMessage, type ReporterMessage, Stage, Status } from "./model";

const createFinalMesage = () =>
  ({
    startMessage: undefined,
    endMessage: undefined,
    messages: [],
  }) as ReportFinalMessage;

let reportMessage: ReportFinalMessage = createFinalMesage();

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
    reportMessage.startMessage = {
      specPath: getSuitePath(test).concat(test.title),
      filename: Cypress.spec.relative,
      start: Date.now(),
    };
  })
  .on(EVENT_TEST_PASS, () => {
    reportMessage.endMessage = {
      stage: Stage.FINISHED,
      status: Status.PASSED,
      stop: Date.now(),
    };
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    reportMessage.endMessage = {
      stage: Stage.FINISHED,
      status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
      statusDetails: {
        message: err.message,
        trace: err.stack,
      },
      stop: Date.now(),
    };
  });

Cypress.Commands.add("allureReporterMessage", (message: ReporterMessage) => {
  reportMessage.messages.push(message);
});
Cypress.Screenshot.defaults({
  onAfterScreenshot: (_, details) => {
    reportMessage.messages.push({
      type: MessageType.SCREENSHOT,
      payload: {
        path: details.path,
        name: details.name || "Screenshot",
      },
    });
  },
});

afterEach(() => {
  cy.task("allureReportTest", reportMessage);

  reportMessage = createFinalMesage();
});
