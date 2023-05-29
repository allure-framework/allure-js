import path from "path";
import {
  AllureGroup,
  allureReportFolder,
  AllureRuntime,
  AllureStep,
  AllureTest,
  InMemoryAllureWriter,
  Label,
  LabelName,
  Link,
  LinkType,
  md5,
  ParameterOptions,
  Stage,
  Status,
  stripAscii,
} from "allure-js-commons";
import { event } from "codeceptjs";
import {
  CodeceptError,
  CodeceptHook,
  CodeceptStep,
  CodeceptSuite,
  CodeceptTest,
} from "./codecept-types";

import { extractMeta } from "./helpers";

interface ReporterOptions {
  outputDir: string;
  postProcessorForTest?: any;
}
class AllureReporter {
  allureRuntime?: AllureRuntime;
  allureGroupCache = new Map<CodeceptSuite, AllureGroup>();
  allureTestCache = new Map<CodeceptTest, AllureTest>();
  allureWriter?: InMemoryAllureWriter;

  allureStepCache = new Map<AllureTest, Map<CodeceptStep, AllureStep>>();

  currentTest: CodeceptTest | null = null;
  reporterOptions!: ReporterOptions;
  constructor(config: ReporterOptions) {
    this.registerEvents();
    const resultsDir = allureReportFolder(config.outputDir);
    this.allureWriter = config.postProcessorForTest ? new InMemoryAllureWriter() : undefined;
    this.allureRuntime = new AllureRuntime({ resultsDir, writer: this.allureWriter });
    this.reporterOptions = config || {};
  }

  registerEvents() {
    // Suite
    event.dispatcher.addListener(event.suite.before, this.suiteStarted.bind(this));
    event.dispatcher.addListener(event.suite.after, this.suiteFinished.bind(this));

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

    event.dispatcher.addListener(event.all.result, this.afterAll.bind(this));
  }

  hookStarted(hook: CodeceptHook) {
    this.currentTest = hook.ctx?.currentTest || null;
  }

  hookPassed(hook: CodeceptHook) {
    this.currentTest = null;
  }

  createTest(test: CodeceptTest) {
    const suite = test.parent!;
    const group = this.ensureAllureGroupCreated(suite);
    const allureTest = group.startTest(test.title);

    this.allureStepCache.set(allureTest, new Map());

    allureTest.addLabel(LabelName.LANGUAGE, "javascript");
    allureTest.addLabel(LabelName.FRAMEWORK, "codeceptjs");

    const relativeFile = path.relative(codecept_dir, test.file!).split(path.sep).join("/");
    const fullName = `${relativeFile}#${test.title}`;

    if (suite.title) {
      allureTest.addLabel(LabelName.SUITE, suite.title);
    }

    allureTest.stage = Stage.PENDING;
    allureTest.fullName = fullName;
    allureTest.testCaseId = md5(fullName);
    allureTest.historyId = md5(fullName);

    this.allureTestCache.set(test, allureTest);
  }
  suiteStarted(suite: CodeceptSuite) {
    suite.tests.forEach((test) => {
      this.createTest(test);
    });
    // @ts-ignore
    this.currentTest = suite.ctx.currentTest;
  }

  allureTestByCodeceptTest(test: CodeceptTest) {
    let allureTest = this.allureTestCache.get(test);

    if (!allureTest) {
      allureTest = this.allureTestCache.get((test as any).ctx?.currentTest);
    }

    if (!allureTest) {
      this.debug();

      return;
    }

    return allureTest;
  }

  allureStepByCodeceptStep(step: CodeceptStep, allureTest: AllureTest): AllureStep | undefined {
    const steps = this.allureStepCache.get(allureTest);
    const allureStep = steps?.get(step);

    if (!allureStep) {
      this.debug();

      return;
    }
    return allureStep;
  }

  allureSuiteByCodeceptSuite(suite: CodeceptSuite) {
    const group = this.allureGroupCache.get(suite);
    if (!group) {
      this.debug();
      return;
    }

    return group;
  }

  suiteFinished(suite: CodeceptSuite) {
    const group = this.allureSuiteByCodeceptSuite(suite);
    group?.endGroup();
  }

  testStarted(test: CodeceptTest & { tags: string[] }) {
    this.currentTest = test;

    const allureTest = this.allureTestByCodeceptTest(test);
    const { labels } = extractMeta(test);
    if (allureTest) {
      labels.forEach((label) => {
        allureTest.addLabel(label.name, label.value);
      });
    }
  }

  testFailed(test: CodeceptTest, err: CodeceptError) {
    const allureTest = this.allureTestByCodeceptTest(test);

    if (allureTest) {
      allureTest.statusDetails = { message: stripAscii(err.message) };
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.FAILED;
    }
  }

  testPassed(test: CodeceptTest) {
    const allureTest = this.allureTestByCodeceptTest(test);

    if (allureTest) {
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.PASSED;
    }
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
    const allureTest = this.allureTestByCodeceptTest(test);
    if (allureTest) {
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.SKIPPED;
      if (test.opts.skipInfo) {
        allureTest.statusDetails = { message: test.opts.skipInfo.message };
      }
      allureTest.endTest();
    }
  }

  testAfter(test: CodeceptTest) {
    // @ts-ignore
    const currentRetry = test._currentRetry;
    if (currentRetry !== 0) {
      // @ts-ignore
      test = test._retriedTest;
    }
    const allureTest = this.allureTestByCodeceptTest(test);
    allureTest?.endTest();
    this.currentTest = null;
    // @ts-ignore
    if (test.state === "failed" && test._retries !== 0 && currentRetry !== test._retries) {
      this.createTest(test);
    }
  }

  getStepParents(step: CodeceptStep) {
    const parents: CodeceptStep[] = [];
    let innerStep = step;
    while (innerStep.metaStep) {
      parents.unshift(innerStep.metaStep);
      innerStep = innerStep.metaStep;
    }
    return parents;
  }

  stepStarted(step: CodeceptStep) {
    this.validateStep(step);

    const parents = [...this.getStepParents(step), step];
    const allureTest = this.currentAllureTest;
    if (!allureTest) {
      return;
    }

    const steps = this.allureStepCache.get(allureTest);

    let lastParent = (parents.length > 0 && steps?.get(parents[0])) || undefined;

    parents.forEach((parentStep) => {
      const allureStep = !lastParent
        ? allureTest.startStep(parentStep.toString())
        : steps?.get(parentStep) || lastParent.startStep(parentStep.toString());

      steps?.set(parentStep, allureStep);
      lastParent = allureStep;
    });
  }

  // eslint-disable-next-line @typescript-eslint/member-ordering
  lastStepParent: CodeceptStep | undefined;

  validateStep(step: CodeceptStep) {
    const lastParent = [...this.getStepParents(step), step][0];

    if (lastParent !== this.lastStepParent) {
      this.allureStepCache.set(this.currentAllureTest!, new Map());
    }

    this.lastStepParent = lastParent;
  }

  stepFailed(step: CodeceptStep) {
    const allureStep = this.allureStepByCodeceptStep(step, this.currentAllureTest!);
    if (allureStep) {
      allureStep.status = Status.FAILED;
      allureStep.endStep();
    }
  }
  stepComment(step: CodeceptStep) {
    const allureStep = this.currentAllureTest?.startStep(step.toString());
    if (allureStep) {
      allureStep.status = Status.PASSED;
      allureStep.endStep();
    }
  }

  stepPassed(step: CodeceptStep) {
    const allureStep = this.allureStepByCodeceptStep(step, this.currentAllureTest!);

    if (allureStep) {
      allureStep.status = Status.PASSED;
      allureStep.endStep();
    }
  }

  stepFinished(step: CodeceptStep) {
    const parentStep = this.getStepParents(step)[0] || step;
    const allureStep = this.allureStepByCodeceptStep(parentStep, this.currentAllureTest!);

    if (allureStep) {
      allureStep.status = allureStep.isAnyStepFailed ? Status.FAILED : Status.PASSED;
      allureStep.endStep();
    }
  }

  afterAll() {
    if (this.reporterOptions.postProcessorForTest) {
      this.reporterOptions.postProcessorForTest(this.allureWriter);
    }
  }

  ensureAllureGroupCreated(suite: CodeceptSuite): AllureGroup {
    let group = this.allureGroupCache.get(suite);
    if (!group) {
      const parent = suite.parent
        ? this.ensureAllureGroupCreated(suite.parent)
        : this.getAllureRuntime();

      group = parent.startGroup(suite.fullTitle());
      this.allureGroupCache.set(suite, group);
    }
    return group;
  }

  getAllureRuntime(): AllureRuntime {
    if (!this.allureRuntime) {
      throw new Error("Unexpected state: `allureRuntime` is not initialized");
    }
    return this.allureRuntime;
  }

  debug(msg?: string) {
    const error = new Error(msg || "Something went wrong");
    codeceptjs.output.log(`${error.message} ${error.stack || ""}`);
  }

  get currentAllureTest() {
    if (!this.currentTest) {
      this.debug();
      return;
    }
    const allureTest = this.allureTestByCodeceptTest(this.currentTest);
    return allureTest;
  }

  addLabel(name: string, value: string) {
    this.label(name, value);
  }

  label(name: string, value: string) {
    this.currentAllureTest?.addLabel(name, value);
  }

  addAttachment(name: string, buffer: Buffer | string, type: string) {
    const runtime = this.getAllureRuntime();
    const fileName = runtime.writeAttachment(buffer, { contentType: type });

    this.currentAllureTest?.addAttachment(name, type, fileName);
  }

  addScreenDiff(name: string, expectedImg: string, actualImg: string, diffImg: string) {
    const screenDiff = {
      name,
      expected: `data:image/png;base64,${expectedImg}`,
      actual: `data:image/png;base64,${actualImg}`,
      diff: `data:image/png;base64,${diffImg}`,
    };
    this.addAttachment(name, JSON.stringify(screenDiff), "application/vnd.allure.image.diff");
  }

  severity = (severity: string) => {
    this.addLabel(LabelName.SEVERITY, severity);
  };

  epic = (epic: string) => {
    this.addLabel(LabelName.EPIC, epic);
  };

  feature = (feature: string) => {
    this.addLabel(LabelName.FEATURE, feature);
  };

  story = (story: string) => {
    this.addLabel(LabelName.STORY, story);
  };

  description = (description: string) => {
    if (this.currentAllureTest) {
      this.currentAllureTest.description = description;
    }
  };

  parameter(name: string, value: string, options?: ParameterOptions) {
    if (this.currentAllureTest) {
      this.currentAllureTest.addParameter(name, value, options);
    }
  }

  tms(name: string, url: string) {
    this.link(url, name, LinkType.TMS);
  }

  link(url: string, name?: string, type?: string) {
    if (this.currentAllureTest) {
      this.currentAllureTest.addLink(url, name, type);
    }
  }

  labels(...values: Label[]) {
    values.forEach(({ name, value }) => this.label(name, value));
  }

  links(...values: Link[]) {
    values.forEach(({ url, name, type }) => this.link(url, name, type));
  }

  id(id: string) {
    this.label(LabelName.ALLURE_ID, id);
  }

  suite(name: string): void {
    this.label(LabelName.SUITE, name);
  }

  parentSuite(name: string) {
    this.label(LabelName.PARENT_SUITE, name);
  }

  layer(layerName: string) {
    this.label(LabelName.LAYER, layerName);
  }

  subSuite(name: string) {
    this.label(LabelName.SUB_SUITE, name);
  }

  owner(owner: string) {
    this.label(LabelName.OWNER, owner);
  }

  tag(tag: string) {
    this.label(LabelName.TAG, tag);
  }

  tags(...values: string[]) {
    values.forEach((value) => this.tag(value));
  }

  issue(name: string, url: string) {
    this.link(url, name, LinkType.ISSUE);
  }
}

const allurePlugin = (config: { outputDir: string }) => {
  return new AllureReporter(config);
};

export = allurePlugin;
