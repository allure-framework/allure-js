import { event } from "codeceptjs";
import path from "node:path";
import process from "node:process";
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  allureReportFolder,
  md5,
  stripAscii,
} from "allure-js-commons";
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
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";
import { extractMeta } from "./helpers";
import { CodeceptError, CodeceptHook, CodeceptStep, CodeceptSuite, CodeceptTest } from "./model";
import { AllureCodeceptJSConfig } from "./model.js";

interface ReporterOptions {
  outputDir: string;
}

class AllureCodeceptJSReporter {
  allureRuntime?: AllureNodeReporterRuntime;
  allureGroupCache = new Map<CodeceptSuite, AllureGroup>();
  allureTestCache = new Map<CodeceptTest, AllureTest>();
  allureWriter = process.env.ALLURE_POST_PROCESSOR_FOR_TEST ? new MessageAllureWriter() : undefined;
  allureStepCache = new Map<AllureTest, Map<CodeceptStep, AllureStep>>();

  allureTestsUuids = new Map<string, string>();
  currentAllureResultUuid?: string;

  currentTest: CodeceptTest | null = null;
  reporterOptions!: ReporterOptions;
  config!: AllureCodeceptJSConfig;

  constructor(config: AllureCodeceptJSConfig) {
    console.log({ config });

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

  registerEvents() {
    // Suite
    // TODO: guess, we don't need handle suites because we have all the required data right in the tests
    // event.dispatcher.addListener(event.suite.before, this.suiteStarted.bind(this));
    // event.dispatcher.addListener(event.suite.after, this.suiteFinished.bind(this));
    event.dispatcher.addListener(event.hook.started, this.hookStarted.bind(this));
    event.dispatcher.addListener(event.hook.passed, this.hookPassed.bind(this));
    // Test
    event.dispatcher.addListener(event.test.started, this.testStarted.bind(this));
    event.dispatcher.addListener(event.test.skipped, this.testSkipped.bind(this));
    event.dispatcher.addListener(event.test.passed, this.testPassed.bind(this));
    event.dispatcher.addListener(event.test.failed, this.testFailed.bind(this));
    event.dispatcher.addListener(event.test.after, this.testAfter.bind(this));
    // Step
    event.dispatcher.addListener(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.addListener(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.addListener(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.addListener(event.step.finished, this.stepFinished.bind(this));
    event.dispatcher.addListener(event.step.comment, this.stepComment.bind(this));
  }

  hookStarted(hook: CodeceptHook) {
    console.log("hook started", hook.ctx?.currentTest);
    // this.currentTest = hook.ctx?.currentTest || null;
  }

  hookPassed(hook: CodeceptHook) {
    // this.currentTest = null;
  }

  // TODO: probably we need to create tests here because we can't handle skipped ones in another way
  suiteStarted(suite: CodeceptSuite) {
    console.log("suite started", suite);
    // suite.tests.forEach((test) => {
    //   this.createTest(test);
    // });
  }

  allureTestByCodeceptTest(test: CodeceptTest) {
    // let allureTest = this.allureTestCache.get(test);
    //
    // if (!allureTest) {
    //   // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    //   allureTest = this.allureTestCache.get((test as any).ctx?.currentTest);
    // }
    //
    // if (!allureTest) {
    //   this.debug();
    //
    //   return;
    // }
    //
    // return allureTest;
  }

  allureStepByCodeceptStep(step: CodeceptStep, allureTest: AllureTest) {
    // const steps = this.allureStepCache.get(allureTest);
    // const allureStep = steps?.get(step);
    //
    // if (!allureStep) {
    //   this.debug();
    //
    //   return;
    // }
    // return allureStep;
  }

  allureSuiteByCodeceptSuite(suite: CodeceptSuite) {
    // const group = this.allureGroupCache.get(suite);
    // if (!group) {
    //   this.debug();
    //   return;
    // }
    //
    // return group;
  }

  suiteFinished(suite: CodeceptSuite) {
    // const group = this.allureSuiteByCodeceptSuite(suite);
    // group?.endGroup();
  }

  testStarted(test: CodeceptTest & { uid: string; tags: string[] }) {
    const relativeFile = path.relative(codecept_dir, test.file!).split(path.sep).join("/");
    const fullName = `${relativeFile}#${test.title}`;
    const { labels } = extractMeta(test);
    const uuid = this.allureRuntime!.start({
      name: test.title,
      fullName,
      testCaseId: this.allureRuntime!.crypto.md5(fullName),
    });

    this.allureRuntime!.update(uuid, (result) => {
      result.labels.push(...labels);
      result.labels.push({ name: LabelName.LANGUAGE, value: "javascript" });
      result.labels.push({ name: LabelName.FRAMEWORK, value: "codeceptjs" });

      if (test?.parent?.title) {
        result.labels.push({
          name: LabelName.SUITE,
          value: test.parent.title,
        });
      }
    });

    console.log("test started", test.title, this.currentAllureResultUuid, test);

    this.allureTestsUuids.set(test.uid, uuid as string);
    this.currentAllureResultUuid = uuid as string;
  }

  testFailed(test: CodeceptTest & { uid: string }, err: CodeceptError) {
    console.log("test failed", this.currentAllureResultUuid);

    const testUuid = this.allureTestsUuids.get(test.uid);

    this.allureRuntime!.update(testUuid!, (result) => {
      result.status = Status.FAILED;
      result.stage = Stage.FINISHED;
      // TODO: strip ansi here
      result.statusDetails = { message: err.message };
    });
  }

  testPassed(test: CodeceptTest & { uid: string }) {
    console.log("test passed", this.currentAllureResultUuid);

    // const testUuid = this.allureTestsUuids.get(test.uid);

    this.allureRuntime!.update(this.currentAllureResultUuid!, (result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
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
    console.log("test skipped", this.currentAllureResultUuid);
    // const allureTest = this.allureTestByCodeceptTest(test);
    // if (allureTest) {
    //   allureTest.stage = Stage.FINISHED;
    //   allureTest.status = Status.SKIPPED;
    //   if (test.opts.skipInfo) {
    //     allureTest.statusDetails = { message: test.opts.skipInfo.message };
    //   }
    //   allureTest.endTest();
    // }
  }

  testAfter(test: CodeceptTest & { uid: string }) {

    // // @ts-ignore
    // const currentRetry = test._currentRetry;
    // if (currentRetry !== 0) {
    //   // @ts-ignore
    //   test = test._retriedTest;
    // }
    // const allureTest = this.allureTestByCodeceptTest(test);
    // allureTest?.endTest();
    // this.currentTest = null;
    // // @ts-ignore
    // if (test.state === "failed" && test._retries !== 0 && currentRetry !== test._retries) {
    //   this.createTest(test);
    // }

    this.allureRuntime!.stop(this.currentAllureResultUuid!);
    this.allureRuntime!.write(this.currentAllureResultUuid!);
    this.currentAllureResultUuid = undefined;
  }

  getStepParents(step: CodeceptStep) {
    // const parents: CodeceptStep[] = [];
    // let innerStep = step;
    // while (innerStep.metaStep) {
    //   parents.unshift(innerStep.metaStep);
    //   innerStep = innerStep.metaStep;
    // }
    // return parents;
  }

  stepStarted(step: CodeceptStep) {
    // this.validateStep(step);
    //
    // const parents = [...this.getStepParents(step), step];
    // const allureTest = this.currentAllureTest;
    // if (!allureTest) {
    //   return;
    // }
    //
    // const steps = this.allureStepCache.get(allureTest);
    //
    // let lastParent = (parents.length > 0 && steps?.get(parents[0])) || undefined;
    //
    // parents.forEach((parentStep) => {
    //   const allureStep = !lastParent
    //     ? allureTest.startStep(parentStep.toString())
    //     : steps?.get(parentStep) || lastParent.startStep(parentStep.toString());
    //
    //   steps?.set(parentStep, allureStep);
    //   lastParent = allureStep;
    // });
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  lastStepParent: CodeceptStep | undefined;

  validateStep(step: CodeceptStep) {
    // const lastParent = [...this.getStepParents(step), step][0];
    //
    // if (lastParent !== this.lastStepParent) {
    //   this.allureStepCache.set(this.currentAllureTest!, new Map());
    // }
    //
    // this.lastStepParent = lastParent;
  }

  stepFailed(step: CodeceptStep) {
    // const allureStep = this.allureStepByCodeceptStep(step, this.currentAllureTest!);
    // if (allureStep) {
    //   allureStep.status = Status.FAILED;
    //   allureStep.endStep();
    // }
  }

  stepComment(step: CodeceptStep) {
    // const allureStep = this.currentAllureTest?.startStep(step.toString());
    // if (allureStep) {
    //   allureStep.status = Status.PASSED;
    //   allureStep.endStep();
    // }
  }

  stepPassed(step: CodeceptStep) {
    // const allureStep = this.allureStepByCodeceptStep(step, this.currentAllureTest!);
    //
    // if (allureStep) {
    //   allureStep.status = Status.PASSED;
    //   allureStep.endStep();
    // }
  }

  stepFinished(step: CodeceptStep) {
    // const parentStep = this.getStepParents(step)[0] || step;
    // const allureStep = this.allureStepByCodeceptStep(parentStep, this.currentAllureTest!);
    //
    // if (allureStep) {
    //   allureStep.status = allureStep.isAnyStepFailed ? Status.FAILED : Status.PASSED;
    //   allureStep.endStep();
    // }
  }

  ensureAllureGroupCreated(suite: CodeceptSuite) {
    // let group = this.allureGroupCache.get(suite);
    // if (!group) {
    //   const parent = suite.parent ? this.ensureAllureGroupCreated(suite.parent) : this.getAllureRuntime();
    //
    //   group = parent.startGroup(suite.fullTitle());
    //   this.allureGroupCache.set(suite, group);
    // }
    // return group;
  }

  getAllureRuntime() {
    // if (!this.allureRuntime) {
    //   throw new Error("Unexpected state: `allureRuntime` is not initialized");
    // }
    // return this.allureRuntime;
  }

  debug(msg?: string) {
    // const error = new Error(msg || "Something went wrong");
    // codeceptjs.output.log(`${error.message} ${error.stack || ""}`);
  }

  // get currentAllureTest() {
  //   // if (!this.currentTest) {
  //   //   this.debug();
  //   //   return;
  //   // }
  //   // return this.allureTestByCodeceptTest(this.currentTest);
  // }

  addAttachment(name: string, buffer: Buffer | string, type: string) {
    // const runtime = this.getAllureRuntime();
    // const fileName = runtime.writeAttachment(buffer, { contentType: type });
    //
    // this.currentAllureTest?.addAttachment(name, type, fileName);
  }

  addScreenDiff(name: string, expectedImg: string, actualImg: string, diffImg: string) {
    // const screenDiff = {
    //   name,
    //   expected: `data:image/png;base64,${expectedImg}`,
    //   actual: `data:image/png;base64,${actualImg}`,
    //   diff: `data:image/png;base64,${diffImg}`,
    // };
    // this.addAttachment(name, JSON.stringify(screenDiff), "application/vnd.allure.image.diff");
  }

  handleRuntimeMessage(message: RuntimeMessage) {
    this.allureRuntime!.applyRuntimeMessages(this.currentAllureResultUuid!, [message]);
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
