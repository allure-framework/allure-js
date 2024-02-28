import { MessageType, type MessagesQueue, type ReporterMessage, Stage, Status } from "./model";

let messagesQueue: MessagesQueue = [];

const { EVENT_TEST_BEGIN, EVENT_TEST_FAIL, EVENT_TEST_PASS, EVENT_TEST_END } = Mocha.Runner.constants;

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
    messagesQueue.push({
      type: MessageType.TEST_STARTED,
      payload: {
        specPath: getSuitePath(test).concat(test.title),
        filename: Cypress.spec.relative,
        start: Date.now(),
      },
    });
  })
  .on(EVENT_TEST_PASS, (test: Mocha.Test) => {
    messagesQueue.push({
      type: MessageType.TEST_ENDED,
      payload: {
        stage: Stage.FINISHED,
        status: Status.PASSED,
        stop: Date.now(),
      },
    });

    cy.task("allureReportTest", messagesQueue);

    messagesQueue = [];
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    messagesQueue.push({
      type: MessageType.TEST_ENDED,
      payload: {
        stage: Stage.FINISHED,
        status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
        statusDetails: {
          message: err.message,
          trace: err.stack,
        },
        stop: Date.now(),
      },
    });

    cy.task("allureReportTest", messagesQueue);

    messagesQueue = [];
  });

Cypress.Commands.add("allureReporterMessage", (message: ReporterMessage) => {
  messagesQueue.push(message);
});
Cypress.Screenshot.defaults({
  onAfterScreenshot: (_, details) => {
    messagesQueue.push({
      type: MessageType.SCREENSHOT,
      payload: {
        path: details.path,
        name: details.name || "Screenshot",
      },
    });
  },
});
