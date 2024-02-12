import { Stage, Status, MetadataMessage, type StartTestMessage, type EndTestMessage } from "./model";

const messagesQueue: (StartTestMessage | EndTestMessage)[] = [];

const {
  EVENT_TEST_BEGIN,
  EVENT_TEST_FAIL,
  EVENT_TEST_PASS,
  EVENT_TEST_PENDING,
  EVENT_SUITE_BEGIN,
  EVENT_SUITE_END,
  EVENT_TEST_END,
  EVENT_HOOK_BEGIN,
  EVENT_HOOK_END,
  EVENT_TEST_RETRY,
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
  // .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
  //   // console.log("suite begin", { suite, runtime })
  // })
  // .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
  //   // console.log("suite end", { suite, runtime })
  //   // cy.now("task", "allureEndTest", "goodbye")
  // })
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
  })
  // .on(EVENT_TEST_PENDING, (test: Mocha.Test) => {
  //   // TODO: as in vitest, we need to report manually skipped tests
  //   // state.endTest(Status.SKIPPED, Stage.PENDING);
  // })

// TODO: add commands as json attachments
// Cypress.on("command:start", (attrs: any, command: any) => {
//   console.log("command:start", { attrs, command, spec: Cypress.spec.relative });
// });
// Cypress.on("command:end", (attrs: any, command: any) => {
//   console.log("command:end", { attrs, command, spec: Cypress.spec.relative });
// });

// @ts-ignore
Cypress.Commands.add("allureMetadataMessage", (message: MetadataMessage) => {
  cy.task("allureMetadata", message);
});

beforeEach(() => {
  cy.task("allureStartTest", messagesQueue.pop());
});

afterEach(() => {
  cy.task("allureEndTest", messagesQueue.pop());
});
