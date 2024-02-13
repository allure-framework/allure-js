import { Stage, Status, MetadataMessage, type StartTestMessage, type EndTestMessage } from "./model";

const messagesQueue: (StartTestMessage | EndTestMessage)[] = [];

const {
  EVENT_TEST_BEGIN,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
} = Mocha.Runner.constants;

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
Cypress.mocha.getRunner()
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

// @ts-ignore
Cypress.Commands.add("allureMetadataMessage", (message: MetadataMessage) => {
  cy.task("allureMetadata", message);
});
// @ts-ignore
Cypress.Commands.add("allureStartStep", (name: string) => {
  cy.task("allureStartStep", name);
});
// @ts-ignore
Cypress.Commands.add("allureEndStep", () => {
  cy.task("allureEndStep");
});

beforeEach(() => {
  cy.task("allureStartTest", messagesQueue.pop());
});

afterEach(() => {
  cy.task("allureEndTest", messagesQueue.pop());
});
