import { event } from "codeceptjs";
import path from "node:path";
import {
  AllureNodeReporterRuntime,
  FileSystemAllureWriter,
  LabelName,
  MessageAllureWriter,
  RuntimeMessage,
  Stage,
  Status,
  extractMetadataFromString,
} from "allure-js-commons/sdk/node";
import { extractMeta } from "./helpers";
import { AllureCodeceptJsConfig, CodeceptError, CodeceptHook, CodeceptStep, CodeceptTest } from "./model.js";

export class AllureCodeceptJsReporter {
  allureRuntime?: AllureNodeReporterRuntime;
  currentAllureResultUuid?: string;
  currentTest: CodeceptTest | null = null;
  config!: AllureCodeceptJsConfig;

  constructor(config: AllureCodeceptJsConfig) {
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
      result.statusDetails = { message: err.message };
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
