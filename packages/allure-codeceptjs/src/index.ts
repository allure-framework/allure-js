import { event } from "codeceptjs";
import path from "node:path";
import stripAnsi from "strip-ansi";
import {
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
  extractMetadataFromString,
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";
import { extractMeta } from "./helpers";
import { CodeceptError, CodeceptHook, CodeceptStep, CodeceptTest } from "./model";
import { AllureCodeceptJSConfig } from "./model.js";

interface ReporterOptions {
  outputDir: string;
}

class AllureCodeceptJSReporter {
  allureRuntime?: AllureNodeReporterRuntime;
  currentAllureResultUuid?: string;

  currentTest: CodeceptTest | null = null;
  reporterOptions!: ReporterOptions;
  config!: AllureCodeceptJSConfig;

  constructor(config: AllureCodeceptJSConfig) {
    this.registerEvents();
    this.config = config || {};
    this.allureRuntime = new AllureNodeReporterRuntime({
      ...config,
      writer: config.testMode
        ? new MessageAllureWriter()
        : new FileSystemAllureWriter({
            resultsDir: config.resultsDir || "./allure-results",
          }),
    });
  }

  private closeCurrentAllureTest(test: CodeceptTest) {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateTest((result) => {
      result.stage = Stage.FINISHED;

      // @ts-ignore
      if (test._retries <= 0) {
        return;
      }

      // @ts-ignore
      result.parameters!.push({ name: "Repetition", value: `${test.retryNum + 1}` });
    }, this.currentAllureResultUuid);

    this.allureRuntime!.stopTest({ uuid: this.currentAllureResultUuid });
    this.allureRuntime!.writeTest(this.currentAllureResultUuid);
    this.currentAllureResultUuid = undefined;
  }

  private startAllureTest(test: CodeceptTest) {
    const relativeFile = path.relative(codecept_dir, test.file!).split(path.sep).join("/");
    const fullName = `${relativeFile}#${test.title}`;
    const titleMetadata = extractMetadataFromString(test.title);
    // @ts-ignore
    const { labels } = extractMeta(test);

    this.currentAllureResultUuid = this.allureRuntime!.startTest({
      name: titleMetadata.cleanTitle,
      fullName,
      testCaseId: this.allureRuntime!.crypto.md5(fullName),
    });

    this.allureRuntime!.updateTest((result) => {
      result.labels.push(...labels);
      result.labels.push(...titleMetadata.labels);
      result.labels.push({ name: LabelName.LANGUAGE, value: "javascript" });
      result.labels.push({ name: LabelName.FRAMEWORK, value: "codeceptjs" });

      if (test?.parent?.title) {
        result.labels.push({
          name: LabelName.SUITE,
          value: test.parent.title,
        });
      }
    }, this.currentAllureResultUuid);
  }

  private closeCurrentAllureStep() {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateStep((result) => {
      result.stage = Stage.FINISHED;
    }, this.currentAllureResultUuid);
    this.allureRuntime!.stopStep({ uuid: this.currentAllureResultUuid });
  }

  registerEvents() {
    // Hooks
    event.dispatcher.addListener(event.hook.started, this.hookStarted.bind(this));
    event.dispatcher.addListener(event.hook.passed, this.hookPassed.bind(this));
    // Test
    event.dispatcher.addListener(event.test.started, this.testStarted.bind(this));
    event.dispatcher.addListener(event.test.skipped, this.testSkipped.bind(this));
    event.dispatcher.addListener(event.test.passed, this.testPassed.bind(this));
    event.dispatcher.addListener(event.test.failed, this.testFailed.bind(this));
    // Step
    event.dispatcher.addListener(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.addListener(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.addListener(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.addListener(event.step.comment, this.stepComment.bind(this));
  }

  hookStarted(hook: CodeceptHook) {
    const currentTest = hook?.ctx?.currentTest;

    if (!currentTest) {
      return;
    }

    // @ts-ignore
    this.startAllureTest(currentTest);
    // TODO: group before hooks into fixture
    this.allureRuntime!.startStep(
      {
        name: "before hook",
      },
      this.currentAllureResultUuid!,
    );
  }

  hookPassed() {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    }, this.currentAllureResultUuid);
    this.allureRuntime!.stopStep({ uuid: this.currentAllureResultUuid });
  }

  testStarted(test: CodeceptTest & { tags: string[] }) {
    // test has been already started
    if (this.currentAllureResultUuid) {
      return;
    }

    this.startAllureTest(test);
  }

  testFailed(test: CodeceptTest, err: CodeceptError) {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateTest((result) => {
      result.status = Status.FAILED;
      result.statusDetails = { message: stripAnsi(err.message) };
    }, this.currentAllureResultUuid);
    this.closeCurrentAllureTest(test);
  }

  testPassed(test: CodeceptTest) {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateTest((result) => {
      result.status = Status.PASSED;
    }, this.currentAllureResultUuid);
    this.closeCurrentAllureTest(test);
  }

  testSkipped(
    test: CodeceptTest & {
      opts: {
        skipInfo: {
          message: string;
          isFastSkipped: boolean;
        };
      };
    },
  ) {
    if (!this.currentAllureResultUuid) {
      return;
    }

    this.allureRuntime!.updateTest((result) => {
      result.status = Status.SKIPPED;

      if (test.opts.skipInfo) {
        result.statusDetails = { message: test.opts.skipInfo.message };
      }
    }, this.currentAllureResultUuid);
    this.closeCurrentAllureTest(test);
  }

  stepStarted(step: CodeceptStep) {
    this.allureRuntime!.startStep(
      {
        name: `${step.actor} ${step.name}`,
      },
      this.currentAllureResultUuid!,
    );
  }

  stepFailed() {
    this.allureRuntime!.updateStep((result) => {
      result.status = Status.FAILED;
    }, this.currentAllureResultUuid!);
    this.closeCurrentAllureStep();
  }

  stepComment() {
    this.allureRuntime!.updateStep((result) => {
      result.status = Status.PASSED;
    }, this.currentAllureResultUuid!);
    this.closeCurrentAllureStep();
  }

  stepPassed() {
    this.allureRuntime!.updateStep((result) => {
      result.status = Status.PASSED;
    }, this.currentAllureResultUuid!);
    this.closeCurrentAllureStep();
  }

  // TODO: not implemented in the new version at all
  // addScreenDiff(name: string, expectedImg: string, actualImg: string, diffImg: string) {
  //   const screenDiff = {
  //     name,
  //     expected: `data:image/png;base64,${expectedImg}`,
  //     actual: `data:image/png;base64,${actualImg}`,
  //     diff: `data:image/png;base64,${diffImg}`,
  //   };
  //   this.addAttachment(name, JSON.stringify(screenDiff), "application/vnd.allure.image.diff");
  // }

  handleRuntimeMessage(message: RuntimeMessage) {
    this.allureRuntime!.applyRuntimeMessages([message], { testUuid: this.currentAllureResultUuid! });
  }
}

class AllureCodeceptJSTestRuntime implements TestRuntime {
  constructor(private readonly reporter: AllureCodeceptJSReporter) {}

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
          status: Status.FAILED,
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
    this.reporter.handleRuntimeMessage(message);

    return Promise.resolve();
  }
}

const allurePlugin = (config: AllureCodeceptJSConfig) => {
  const reporter = new AllureCodeceptJSReporter(config);
  const testRuntime = new AllureCodeceptJSTestRuntime(reporter);

  setGlobalTestRuntime(testRuntime);
};

export default allurePlugin;
