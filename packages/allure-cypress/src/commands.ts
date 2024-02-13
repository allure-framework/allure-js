import { type EndTestMessage, Stage, type StartTestMessage, Status } from "./model";

const messagesQueue: (StartTestMessage | EndTestMessage)[] = [];

const { EVENT_TEST_BEGIN, EVENT_TEST_FAIL, EVENT_TEST_PASS } = Mocha.Runner.constants;

const getSuitePath = (test: Mocha.Test): string[] => {
  const path = [];
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
      specPath: getSuitePath(test).concat(test.title),
      filename: Cypress.spec.relative,
      start: Date.now(),
    });
  })
  .on(EVENT_TEST_PASS, (test: Mocha.Test) => {
    messagesQueue.push({
      stage: Stage.FINISHED,
      status: Status.PASSED,
      stop: Date.now(),
    });
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    messagesQueue.push({
      stage: Stage.FINISHED,
      status: Status.FAILED,
      statusDetails: {
        message: err.message,
        trace: err.stack,
      },
      stop: Date.now(),
    });
  });

Cypress.Commands.add("allureMetadataMessage", (message) => {
  cy.task("allureMetadata", message);
});
Cypress.Commands.add("allureStartStep", (message) => {
  cy.task("allureStartStep", message);
});
Cypress.Commands.add("allureEndStep", (message) => {
  cy.task("allureEndStep", message);
});

beforeEach(() => {
  cy.task("allureStartTest", messagesQueue.pop());
});

afterEach(() => {
  cy.task("allureEndTest", messagesQueue.pop());
});
