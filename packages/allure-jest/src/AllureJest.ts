import os from "os";
import process from "process";
import { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";
import type { Circus } from "@jest/types";
import {
  AllureCommandStepExecutable,
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
  }

  setup() {
    return super.setup();
  }

  teardown() {
    return super.teardown();
  }

  handleAllureMetadata(payload: { currentTestName: string; metadata: MetadataMessage }) {
    const currentTest = this.runningTests.get(payload.currentTestName)!;
    const {
      attachments = [],
      labels = [],
      links = [],
      parameter = [],
      steps = [],
      description,
      descriptionHtml,
      displayName,
    } = payload.metadata;

    labels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });
    links.forEach((link) => {
      currentTest.addLink(link.url, link.name, link.type);
    });
    parameter.forEach((param) => {
      currentTest.parameter(param.name, param.value, {
        excluded: param.excluded,
        mode: param.mode,
      });
    });
    attachments.forEach((attachment) => {
      const attachmentFilename = this.runtime.writeAttachment(
        attachment.content,
        attachment.type,
        attachment.encoding,
      );

      currentTest.addAttachment(
        "Attachment",
        {
          contentType: attachment.type,
        },
        attachmentFilename,
      );
    });
    steps.forEach((stepMetadata) => {
      const step = AllureCommandStepExecutable.toExecutableItem(this.runtime, stepMetadata);

      currentTest.addStep(step);
    });

    if (description) {
      currentTest.description = description;
    }

    if (descriptionHtml) {
      currentTest.descriptionHtml = descriptionHtml;
    }

    if (displayName) {
      currentTest.name = displayName;
    }
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

    currentTest.stage = Stage.FINISHED;
    currentTest.status = Status.FAILED;
    currentTest.statusDetails = {
      message: test.errors[0].message,
      trace: test.errors[0].stack,
    };
  }

  private handleTestSkip(test: Circus.TestEntry) {
    const currentTestID = getTestID(getTestPath(test));
    const currentTest = this.runningTests.get(currentTestID)!;

    currentTest.stage = Stage.PENDING;
    currentTest.status = Status.SKIPPED;
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
