import os from "os";
import process from "process";
import { EnvironmentContext, JestEnvironment, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import {
  AllureRuntime,
  AllureTest,
  getSuitesLabels,
  LabelName,
  Link,
  LinkType,
  MetadataMessage,
  Stage,
  Status,
} from "allure-js-commons";
import { AllureJestApi } from "./AllureJestApi";
import { getTestId, getTestPath, removeAnsiColorsFromString } from "./utils";

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME, JEST_WORKER_ID } = process.env;
const hostname = os.hostname();

export interface AllureEnvironment extends JestEnvironment {
  transformLinks(links: Link[]): Link[];

  handleAllureMetadata(payload: { currentTestName: string; metadata: MetadataMessage }): void;
}

export interface LinkMatcher {
  type: LinkType | string;
  urlTemplate: string;
}

const createJestEnvironment = <T extends typeof JestEnvironment>(Base: T): T => {
  // @ts-expect-error (ts(2545)) Incorrect assumption about a mixin class: https://github.com/microsoft/TypeScript/issues/37142
  return class extends Base {
    testRootDirPath: string;
    runtime: AllureRuntime;
    linksMatchers: LinkMatcher[];
    runningTests: Map<string, AllureTest> = new Map();

    constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
      super(config, context);

      const { resultsDir = "allure-results", links = [] } =
        config?.projectConfig?.testEnvironmentOptions || {};

      this.runtime = new AllureRuntime({
        resultsDir: resultsDir as string,
      });
      this.linksMatchers = links as LinkMatcher[];
      this.global.allure = new AllureJestApi(this, this.global);
      this.testRootDirPath = config.globalConfig.rootDir;
    }

    setup() {
      return super.setup();
    }

    teardown() {
      return super.teardown();
    }

    transformLinks(links: Link[]): Link[] {
      return links.map((link) => {
        const matcher = this.linksMatchers.find((m) => m.type === link.type);

        if (!matcher) {
          return link;
        }

        return {
          ...link,
          url: matcher.urlTemplate.replace("%s", link.url),
        };
      });
    }

    handleAllureMetadata(payload: { currentTestName: string; metadata: MetadataMessage }) {
      const currentTest = this.runningTests.get(payload.currentTestName)!;

      currentTest.applyMetadata(payload.metadata);
    }

    handleTestEvent = (event: Circus.Event, state: Circus.State) => {
      switch (event.name) {
        case "add_test":
          this.handleTestAdd({
            testName: event.testName,
            concurrent: event.concurrent,
            state,
          });
          break;
        case "test_start":
          this.handleTestStart(event.test);
          break;
        case "test_todo":
          this.handleTestTodo(event.test);
          break;
        case "test_fn_success":
          this.handleTestPass(event.test);
          break;
        case "test_fn_failure":
          this.handleTestFail(event.test);
          break;
        case "test_skip":
          this.handleTestSkip(event.test);
          break;
        case "test_done":
          this.handleTestDone(event.test);
          break;
        default:
          break;
      }
    };

    private handleTestAdd(payload: { testName: string; concurrent: boolean; state: Circus.State }) {
      const { testName, state } = payload;
      const { currentDescribeBlock } = state;
      const newTestSuitesPath = getTestPath(currentDescribeBlock);
      const newTestPath = newTestSuitesPath.concat(testName);
      const newTestId = getTestId(newTestPath);
      const newTest = new AllureTest(this.runtime);
      const thread = ALLURE_THREAD_NAME || JEST_WORKER_ID || process.pid.toString();
      const host = ALLURE_HOST_NAME || hostname;

      newTest.name = testName;
      newTest.fullName = newTestId;

      newTest.addLabel(LabelName.LANGUAGE, "javascript");
      newTest.addLabel(LabelName.FRAMEWORK, "jest");

      if (thread) {
        newTest.addLabel(LabelName.THREAD, thread);
      }

      if (host) {
        newTest.addLabel(LabelName.HOST, host);
      }

      getSuitesLabels(newTestSuitesPath).forEach((label) => {
        newTest.addLabel(label.name, label.value);
      });

      /**
       * If user have some tests with the same name, reporter will throw an error due the test with
       * the same name could be removed from the running tests, so better to throw an explicit error
       */
      if (this.runningTests.has(newTestId)) {
        throw new Error(
          `Test "${newTestId}" has been already initialized! To continue with reporting, please rename the test.`,
        );
      }

      this.runningTests.set(newTestId, newTest);
    }

    private handleTestStart(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to start it!`);
        return;
      }

      currentTest.stage = Stage.RUNNING;
    }

    private handleTestPass(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to mark it as passed!`);
        return;
      }

      currentTest.stage = Stage.FINISHED;
      currentTest.status = Status.PASSED;
    }

    private handleTestFail(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to mark it as failed!`);
        return;
      }

      // jest collects all errors, but we need to report the first one because it's a reason why the test has been failed
      const [error] = test.errors;
      const hasMultipleErrors = Array.isArray(error);
      const errorMessage = (hasMultipleErrors ? error[0].message : error.message) as string;
      const errorTrace = (hasMultipleErrors ? error[0].stack : error.stack) as string;

      currentTest.stage = Stage.FINISHED;
      currentTest.status = Status.FAILED;
      currentTest.statusDetails = {
        message: removeAnsiColorsFromString(errorMessage),
        trace: removeAnsiColorsFromString(errorTrace),
      };
    }

    private handleTestSkip(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to mark it as skipped!`);
        return;
      }

      currentTest.stage = Stage.PENDING;
      currentTest.status = Status.SKIPPED;

      currentTest.endTest();
      this.runningTests.delete(currentTestId);
    }

    private handleTestDone(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to dispose it after start!`);
        return;
      }

      currentTest.endTest();
      this.runningTests.delete(currentTestId);
    }

    private handleTestTodo(test: Circus.TestEntry) {
      const currentTestId = getTestId(getTestPath(test));
      const currentTest = this.runningTests.get(currentTestId)!;

      if (!currentTest) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to mark it as todo!`);
        return;
      }

      currentTest.stage = Stage.PENDING;
      currentTest.status = Status.SKIPPED;

      currentTest.endTest();
      this.runningTests.delete(currentTestId);
    }
  };
};

export default createJestEnvironment;
