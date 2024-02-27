import {
  type EndTestMessage,
  type MetadataMessage,
  Stage,
  type StartTestMessage,
  Status,
  type TestMetadata,
} from "./model";

const messagesQueue: (StartTestMessage | EndTestMessage)[] = [];

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

const getTestChain = (test: Mocha.Test): [Mocha.Test, ...Mocha.Suite[]] => {
  const seq: [Mocha.Test, ...Mocha.Suite[]] = [test];
  let parent = test.parent;
  while (parent) {
    seq.push(parent);
    parent = parent.parent;
  }
  return seq;
};

const metadataReducingFn = (left: MetadataMessage, right: MetadataMessage): MetadataMessage => {
  const labels = [...(left.labels ?? []), ...(right.labels ?? [])];
  const links = [...(left.links ?? []), ...(right.links ?? [])];
  const result = { ...left, ...right };
  if (labels.length > 0) {
    result.labels = labels;
  }
  if (links.length > 0) {
    result.links = links;
  }
  return result;
};

const reduceMetadata = (test: Mocha.Test): TestMetadata =>
  getTestChain(test)
    .map((testOrSuite: Mocha.Test | Mocha.Suite): TestMetadata => {
      const state: any = testOrSuite;
      const metadata: ReadonlyArray<TestMetadata> = state._allure_meta ?? [];
      return metadata.reduce(metadataReducingFn, {});
    })
    .reduceRight(metadataReducingFn, {});

// @ts-ignore
Cypress.mocha
  .getRunner()
  .on(EVENT_TEST_BEGIN, (test: Mocha.Test) => {
    messagesQueue.push({
      specPath: getSuitePath(test).concat(test.title),
      filename: Cypress.spec.relative,
      start: Date.now(),
      metadata: reduceMetadata(test),
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
      status: err.constructor.name === "AssertionError" ? Status.FAILED : Status.BROKEN,
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

let _inTest = false;
export const inTest = () => _inTest;

beforeEach(() => {
  cy.task("allureStartTest", messagesQueue.pop());
  _inTest = true;
});

afterEach(() => {
  _inTest = false;
  cy.task("allureEndTest", messagesQueue.pop());
});
