import { Stage, Status, StatusDetails } from "allure-js-commons";
import { type AllureCypressExecutableItem } from "./model";

class AllureCypresReporter {
  testsMessages: AllureCypressExecutableItem[] = [];

  get currentTest() {
    return this.testsMessages[this.testsMessages.length - 1];
  }

  startTest(name: string, suitePath: string[], testRelativePath: string) {
    const testFullName = suitePath.concat(name).join(" ");

    this.testsMessages.push({
      name,
      fullName: `${testRelativePath}#${testFullName}`,
      stage: Stage.RUNNING,
      status: undefined,
      statusDetails: undefined,
      start: Date.now(),
      stop: undefined,
    });
  }

  endTest(status: Status, stage?: Stage, details?: StatusDetails) {
    const test = this.currentTest;

    test.status = status;
    test.statusDetails = details;
    test.stage = stage || Stage.FINISHED;
    test.stop = Date.now();
  }

  popCurrentTest() {
    return this.testsMessages.pop();
  }
}

const state = new AllureCypresReporter();

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
  .on(EVENT_SUITE_BEGIN, (suite: Mocha.Suite) => {
    // console.log("suite begin", { suite, runtime })
  })
  .on(EVENT_SUITE_END, (suite: Mocha.Suite) => {
    // console.log("suite end", { suite, runtime })
    // cy.now("task", "allureEndTest", "goodbye")
  })
  .on(EVENT_TEST_BEGIN, (test: Mocha.Test) => {
    state.startTest(test.title, getSuitePath(test), Cypress.spec.relative);
  })
  .on(EVENT_TEST_PASS, (test: Mocha.Test) => {
    state.endTest(Status.PASSED);
  })
  .on(EVENT_TEST_FAIL, (test: Mocha.Test, err: Error) => {
    state.endTest(Status.FAILED, undefined, {
      message: err.message,
      trace: err.stack,
    });
  })
  .on(EVENT_TEST_PENDING, (test: Mocha.Test) => {
    // TODO: as in vitest, we need to report manually skipped tests
    // state.endTest(Status.SKIPPED, Stage.PENDING);
  })

Cypress.on("command:start", (attrs: any, command: any) => {
  console.log("command:start", { attrs, command, spec: Cypress.spec.relative });
});
Cypress.on("command:end", (attrs: any, command: any) => {
  console.log("command:end", { attrs, command, spec: Cypress.spec.relative });
});

// @ts-ignore
Cypress.Commands.add("allureLabel", (name: string, value: string) => {
  cy.task("allureLabel", { name, value });
});

beforeEach(() => {
  cy.task("allureStartTest", state.currentTest);
});

afterEach(() => {
  cy.task("allureEndTest", state.popCurrentTest());
});
