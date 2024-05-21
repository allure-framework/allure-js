import { EnvironmentContext, JestEnvironment } from "@jest/environment";
import type { JestExpect } from "@jest/expect";
import type { Circus, Global } from "@jest/types";
import os from "node:os";
import { dirname, sep } from "node:path";
import process from "node:process";
import stripAnsi from "strip-ansi";
import * as allure from "allure-js-commons";
import {
  ALLURE_TEST_RUNTIME_KEY,
  AllureNodeReporterRuntime,
  ContentType,
  FileSystemAllureWriter,
  Label,
  LabelName,
  Link,
  LinkType,
  MessageAllureWriter,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
  getStatusFromError,
  getSuitesLabels,
  setGlobalTestRuntime,
} from "allure-js-commons/sdk/node";
import { AllureJestConfig, AllureJestEnvironment } from "./model.js";
import { getTestId, getTestPath } from "./utils.js";

const { ALLURE_HOST_NAME, ALLURE_THREAD_NAME, JEST_WORKER_ID } = process.env;
const hostname = os.hostname();

class AllureJestTestRuntime implements TestRuntime {
  constructor(
    private jestEnvironment: AllureJestEnvironment,
    private context: Global.Global,
  ) {
    context[ALLURE_TEST_RUNTIME_KEY] = () => this;
  }

  async label(name: LabelName | string, value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  async labels(...labels: Label[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  async link(url: string, type?: LinkType | string, name?: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  async links(...links: Link[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  async parameter(name: string, value: string, options?: ParameterOptions) {
    await this.sendMessage({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  async description(markdown: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  async descriptionHtml(html: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  async displayName(name: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  async historyId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  async testCaseId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  async attachment(name: string, content: Buffer | string, type: string | ContentType) {
    await this.sendMessage({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      },
    });
  }

  async step(name: string, body: () => void | PromiseLike<void>) {
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      await body();

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    } catch (err) {
      await this.sendMessage({
        type: "step_stop",
        data: {
          status: getStatusFromError(err as Error),
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            message: (err as Error).message,
            trace: (err as Error).stack,
          },
        },
      });

      throw err;
    }
  }

  async stepDisplayName(name: string) {
    await this.sendMessage({
      type: "step_metadata",
      data: { name },
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    await this.sendMessage({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  async sendMessage(message: RuntimeMessage) {
    const { currentTestName, currentConcurrentTestName } = (this.context.expect as JestExpect).getState();
    const testName = currentTestName || currentConcurrentTestName?.();

    this.jestEnvironment.handleAllureRuntimeMessage({
      currentTestName: testName as string,
      message,
    });

    await Promise.resolve();
  }
}

const createJestEnvironment = <T extends typeof JestEnvironment>(Base: T): T => {
  // @ts-expect-error (ts(2545)) Incorrect assumption about a mixin class: https://github.com/microsoft/TypeScript/issues/37142
  return class extends Base {
    testPath: string;
    runtime: AllureNodeReporterRuntime;
    allureUuidsByTestIds: Map<string, string> = new Map();

    constructor(config: AllureJestConfig, context: EnvironmentContext) {
      super(config, context);

      const {
        resultsDir = "allure-results",
        testMode = false,
        ...restConfig
      } = config?.projectConfig?.testEnvironmentOptions || {};

      this.runtime = new AllureNodeReporterRuntime({
        ...restConfig,
        writer: testMode
          ? new MessageAllureWriter()
          : new FileSystemAllureWriter({
              resultsDir,
            }),
      });
      this.testPath = context.testPath.replace(config.globalConfig.rootDir, "").replace(sep, "");

      // @ts-ignore
      const testRuntime = new AllureJestTestRuntime(this as AllureJestEnvironment, this.global);

      // @ts-ignore
      this.global.allure = allure;

      setGlobalTestRuntime(testRuntime);
    }

    setup() {
      return super.setup();
    }

    teardown() {
      return super.teardown();
    }

    handleAllureRuntimeMessage(payload: { currentTestName: string; message: RuntimeMessage }) {
      const testUuid = this.getTestUuid({
        name: payload.currentTestName,
        // little hack because first element in the path will be always ommited
        parent: { name: "ROOT_DESCRIBE_BLOCK" },
      } as Circus.TestEntry)!;

      this.runtime.applyRuntimeMessages([payload.message], { testUuid });
    }

    private getTestUuid(test: Circus.TestEntry) {
      const testPath = getTestPath(test);
      const currentTestId = getTestId(testPath);
      const testUuid = this.allureUuidsByTestIds.get(currentTestId);

      if (!testUuid) {
        // eslint-disable-next-line no-console
        console.error(`Can't find "${currentTestId}" test while tried to start it!`);
        return undefined;
      }

      return testUuid;
    }

    handleTestEvent = (event: Circus.Event, state: Circus.State) => {
      switch (event.name) {
        case "test_retry":
          this.handleTestAdd({
            testName: event.test.name,
            concurrent: event.test.concurrent,
            state,
          });
          break;
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
      const threadLabel = ALLURE_THREAD_NAME || JEST_WORKER_ID || process.pid.toString();
      const hostLabel = ALLURE_HOST_NAME || hostname;
      const packageLabel = dirname(this.testPath).split(sep).join(".");
      const testUuid = this.runtime.startTest({
        name: testName,
        fullName: newTestId,
        labels: [
          {
            name: LabelName.LANGUAGE,
            value: "javascript",
          },
          {
            name: LabelName.FRAMEWORK,
            value: "jest",
          },
          {
            name: LabelName.PACKAGE,
            value: packageLabel,
          },
        ],
      });

      this.runtime.updateTest((result) => {
        if (threadLabel) {
          result.labels.push({ name: LabelName.THREAD, value: threadLabel });
        }

        if (hostLabel) {
          result.labels.push({ name: LabelName.HOST, value: hostLabel });
        }

        result.labels.push(...getSuitesLabels(newTestSuitesPath));
      }, testUuid);

      /**
       * If user have some tests with the same name, reporter will throw an error due the test with
       * the same name could be removed from the running tests, so better to throw an explicit error
       */
      if (this.allureUuidsByTestIds.has(newTestId)) {
        // eslint-disable-next-line no-console
        console.error(
          `Test "${newTestId}" has been already initialized! To continue with reporting, please rename the test.`,
        );
        return;
      }

      this.allureUuidsByTestIds.set(newTestId, testUuid as string);
    }

    private handleTestStart(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest((result) => {
        result.stage = Stage.RUNNING;
      }, testUuid);
    }

    private handleTestPass(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest((result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.PASSED;
      }, testUuid);
    }

    private handleTestFail(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      // jest collects all errors, but we need to report the first one because it's a reason why the test has been failed
      const [error] = test.errors;
      const hasMultipleErrors = Array.isArray(error);
      const errorMessage = (hasMultipleErrors ? error[0]?.message : error.message) as string;
      const errorTrace = (hasMultipleErrors ? error[0]?.stack : error.stack) as string;
      const status = getStatusFromError(hasMultipleErrors ? error[0] : error);

      this.runtime.updateTest((result) => {
        result.stage = Stage.FINISHED;
        result.status = status;
        result.statusDetails = {
          message: stripAnsi(errorMessage || ""),
          trace: stripAnsi(errorTrace || ""),
        };
      }, testUuid);
    }

    private handleTestSkip(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest((result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      }, testUuid);
      this.runtime.stopTest({ uuid: testUuid });
      this.runtime.writeTest(testUuid);
      // TODO:
      this.allureUuidsByTestIds.delete(getTestId(getTestPath(test)));
    }

    private handleTestDone(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      this.runtime.stopTest({ uuid: testUuid });
      this.runtime.writeTest(testUuid);
      // TODO:
      this.allureUuidsByTestIds.delete(getTestId(getTestPath(test)));
    }

    private handleTestTodo(test: Circus.TestEntry) {
      const testUuid = this.getTestUuid(test);

      if (!testUuid) {
        return;
      }

      this.runtime.updateTest((result) => {
        result.stage = Stage.PENDING;
        result.status = Status.SKIPPED;
      }, testUuid);

      this.runtime.stopTest({ uuid: testUuid });
      this.runtime.writeTest(testUuid);
      // TODO:
      this.allureUuidsByTestIds.delete(getTestId(getTestPath(test)));
    }
  };
};

export default createJestEnvironment;
