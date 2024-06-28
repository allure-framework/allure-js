import { event } from "codeceptjs";
import path from "node:path";
import { env } from "node:process";
import { LabelName, Stage, Status, type StepResult } from "allure-js-commons";
import { type RuntimeMessage, extractMetadataFromString, getMessageAndTraceFromError } from "allure-js-commons/sdk";
import { FileSystemWriter, MessageWriter, ReporterRuntime, md5 } from "allure-js-commons/sdk/reporter";
import type { Config } from "allure-js-commons/sdk/reporter";
import { extractMeta } from "./helpers.js";
import type { CodeceptError, CodeceptHook, CodeceptStep, CodeceptTest } from "./model.js";

export class AllureCodeceptJsReporter {
  allureRuntime: ReporterRuntime;
  currentTestUuid?: string;
  currentFixtureUuid?: string;
  scopeUuids: string[] = [];
  currentTest: CodeceptTest | null = null;
  config!: Config;

  constructor(config: Config) {
    this.registerEvents();
    this.config = config || ({} as Config);
    this.allureRuntime = new ReporterRuntime({
      ...config,
      writer: env.ALLURE_TEST_MODE
        ? new MessageWriter()
        : new FileSystemWriter({
            resultsDir: config.resultsDir || "./allure-results",
          }),
    });
  }

  private closeCurrentAllureTest(test: CodeceptTest) {
    if (!this.currentTestUuid) {
      return;
    }

    this.allureRuntime.updateTest(this.currentTestUuid, (result) => {
      result.stage = Stage.FINISHED;

      // @ts-ignore
      if (test._retries <= 0) {
        return;
      }

      // @ts-ignore
      result.parameters.push({ name: "Repetition", value: `${test.retryNum + 1}` });
    });

    this.allureRuntime.stopTest(this.currentTestUuid);
    this.allureRuntime.writeTest(this.currentTestUuid);
    this.currentTestUuid = undefined;
  }

  private startAllureTest(test: CodeceptTest) {
    const relativeFile = path.relative(codecept_dir, test.file!).split(path.sep).join("/");
    const fullName = `${relativeFile}#${test.title}`;
    const titleMetadata = extractMetadataFromString(test.title);
    // @ts-ignore
    const { labels } = extractMeta(test);

    this.currentTestUuid = this.allureRuntime.startTest(
      {
        name: titleMetadata.cleanTitle,
        fullName,
        testCaseId: md5(fullName),
      },
      this.scopeUuids,
    );

    this.allureRuntime.updateTest(this.currentTestUuid, (result) => {
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
    });
  }

  registerEvents() {
    // Hooks
    event.dispatcher.on(event.hook.started, this.hookStarted.bind(this));
    event.dispatcher.on(event.hook.passed, this.hookPassed.bind(this));
    // Suite
    event.dispatcher.on(event.suite.before, this.suiteBefore.bind(this));
    event.dispatcher.on(event.suite.after, this.suiteAfter.bind(this));
    // Test
    event.dispatcher.on(event.test.started, this.testStarted.bind(this));
    event.dispatcher.on(event.test.skipped, this.testSkipped.bind(this));
    event.dispatcher.on(event.test.passed, this.testPassed.bind(this));
    event.dispatcher.on(event.test.failed, this.testFailed.bind(this));
    // Step
    event.dispatcher.on(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.on(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.on(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.on(event.step.comment, this.stepComment.bind(this));
    // run
    event.dispatcher.on(event.all.after, this.afterAll.bind(this));
  }

  suiteBefore() {
    const scopeUuid = this.allureRuntime.startScope();
    this.scopeUuids.push(scopeUuid);
  }

  suiteAfter() {
    const suiteUuid = this.scopeUuids.pop();
    if (suiteUuid) {
      this.allureRuntime.writeScope(suiteUuid);
    }
  }

  hookStarted(hook: CodeceptHook) {
    const currentRunnable = hook?.ctx?.test;
    const hookType = currentRunnable!.title.match(/^"(?<hookType>.+)" hook/)!.groups!.hookType;
    const fixtureType = /before/.test(hookType) ? "before" : "after";

    const scopeUuid = this.scopeUuids.length > 0 ? this.scopeUuids[this.scopeUuids.length - 1] : undefined;
    if (!scopeUuid) {
      return;
    }

    this.currentFixtureUuid = this.allureRuntime.startFixture(scopeUuid, fixtureType, {
      name: currentRunnable!.title,
      stage: Stage.RUNNING,
      start: Date.now(),
    });
  }

  hookPassed() {
    if (!this.currentFixtureUuid) {
      return;
    }
    this.allureRuntime.updateFixture(this.currentFixtureUuid, (result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });

    this.allureRuntime.stopFixture(this.currentFixtureUuid);
  }

  testStarted(test: CodeceptTest & { tags: string[] }) {
    // test has been already started
    if (this.currentTestUuid) {
      return;
    }

    this.startAllureTest(test);
  }

  testFailed(test: CodeceptTest, err: CodeceptError) {
    if (!this.currentTestUuid) {
      return;
    }

    this.allureRuntime.updateTest(this.currentTestUuid, (result) => {
      result.status = Status.FAILED;
      // @ts-ignore
      result.statusDetails = getMessageAndTraceFromError(err);
    });
    this.closeCurrentAllureTest(test);
  }

  testPassed(test: CodeceptTest) {
    if (!this.currentTestUuid) {
      return;
    }

    this.allureRuntime.updateTest(this.currentTestUuid, (result) => {
      result.status = Status.PASSED;
    });
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
    if (!this.currentTestUuid) {
      return;
    }

    this.allureRuntime.updateTest(this.currentTestUuid, (result) => {
      result.status = Status.SKIPPED;

      if (test.opts.skipInfo) {
        result.statusDetails = { message: test.opts.skipInfo.message };
      }
    });
    this.closeCurrentAllureTest(test);
  }

  stepStarted(step: CodeceptStep) {
    if (!this.currentTestUuid) {
      return;
    }
    this.allureRuntime.startStep(this.currentTestUuid, undefined, {
      name: `${step.actor} ${step.name}`,
    });
  }

  stepFailed() {
    this.stopCurrentStep((result) => {
      result.status = Status.FAILED;
      result.stage = Stage.FINISHED;
    });
  }

  stepComment() {
    this.stopCurrentStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
  }

  stepPassed() {
    this.stopCurrentStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
  }

  stopCurrentStep(updateFunc: (result: StepResult) => void) {
    const currentStep = this.currentTestUuid ? this.allureRuntime.currentStep(this.currentTestUuid) : undefined;

    if (!currentStep) {
      return;
    }
    this.allureRuntime.updateStep(currentStep, updateFunc);
    this.allureRuntime.stopStep(currentStep);
  }

  afterAll() {
    this.allureRuntime.writeEnvironmentInfo();
    this.allureRuntime.writeCategoriesDefinitions();
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
    if (!this.currentTestUuid) {
      return;
    }
    this.allureRuntime.applyRuntimeMessages(this.currentTestUuid, [message]);
  }
}
