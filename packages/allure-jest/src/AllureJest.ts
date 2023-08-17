import os from "os";
import process from "process";
import { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import {
  AllureRuntime,
  AllureTest,
  getSuitesLabels,
  LabelName,
  MetadataMessage,
  Stage,
  Status,
} from "allure-js-commons";
import NodeEnvironment from "jest-environment-node";
import { AllureJestAPI } from "./AllureJestAPI";
import { getTestID, getTestPath } from "./utils";

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME, JEST_WORKER_ID } = process.env;
const hostname = os.hostname();

export default class AllureJest extends NodeEnvironment {
  testRootDirPath: string;
  runtime: AllureRuntime;
  runningTests: Map<string, AllureTest> = new Map();

  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    super(config, context);

    this.runtime = new AllureRuntime({
      // TODO: configure it later
      resultsDir: "allure-results",
    });
    this.global.allure = new AllureJestAPI(this, this.global);
    this.testRootDirPath = config.projectConfig.rootDir;
    this.global.hello = "world";
  }

  setup() {
    return super.setup();
  }

  teardown() {
    return super.teardown();
  }

  handleAllureMetadata(payload: { currentTestName: string; metadata: MetadataMessage }) {
    const currentTest = this.runningTests.get(payload.currentTestName)!;

    currentTest.applyMetadata(payload.metadata);
  }

  handleTestEvent(event: Circus.Event, state: Circus.State) {
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
  }

  private handleTestAdd(payload: { testName: string; concurrent: boolean; state: Circus.State }) {
    const { testName, state, concurrent } = payload;
    const { currentDescribeBlock } = state;
    const newTestSuitesPath = getTestPath(currentDescribeBlock);
    const newTestPath = newTestSuitesPath.concat(testName);
    const newTestID = getTestID(newTestPath);
    const newTest = new AllureTest(this.runtime);
    const thread = ALLURE_THREAD_NAME || JEST_WORKER_ID || process.pid.toString();
    const host = ALLURE_HOST_NAME || hostname;

    newTest.name = testName;
    newTest.fullName = newTestID;

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

    this.runningTests.set(newTestID, newTest);
  }

  private handleTestStart(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.stage = Stage.RUNNING;
  }

  private handleTestPass(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.stage = Stage.FINISHED;
    currentTest.status = Status.PASSED;
  }

  private handleTestFail(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;
    // jest collects all errors, but we need to report the first one because it's a reason why the test has been failed
    const [error] = test.errors;
    const hasMultipleErrors = Array.isArray(error);

    currentTest.stage = Stage.FINISHED;
    currentTest.status = Status.FAILED;
    currentTest.statusDetails = {
      message: hasMultipleErrors ? error[0].message : error.message,
      trace: hasMultipleErrors ? error[0].stack : error.stack,
    };
  }

  private handleTestSkip(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.stage = Stage.PENDING;
    currentTest.status = Status.SKIPPED;

    currentTest.endTest();
    this.runningTests.delete(currentTestID);
  }

  private handleTestDone(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.endTest();
    this.runningTests.delete(currentTestID);
  }

  private handleTestTodo(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.stage = Stage.PENDING;
    currentTest.status = Status.SKIPPED;

    currentTest.endTest();
    this.runningTests.delete(currentTestID);
  }
}
