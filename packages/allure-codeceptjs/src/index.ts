import path from "path";
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  LabelName,
  md5,
  Stage,
  Status,
} from "allure-js-commons";
import { CodeceptError, CodeceptStep, CodeceptSuite, CodeceptTest } from "./codecept-types";

const { event } = global.codeceptjs;

class AllureReporter {
  currentMetaStep = [];
  currentStep?: CodeceptStep;
  allureRuntime?: AllureRuntime;
  allureGroupCache = new Map<CodeceptSuite, AllureGroup>();
  allureTestCache = new Map<CodeceptTest, AllureTest>();
  allureStepCache = new Map<CodeceptStep, AllureStep>();
  currentTest: CodeceptTest | null = null;

  constructor(config: { outputDir: string }) {
    this.registerEvents();
    this.allureRuntime = new AllureRuntime({ resultsDir: config.outputDir || "allure-results" });
  }

  registerEvents() {
    event.dispatcher.addListener(event.suite.before, this.suiteStarted.bind(this));
    event.dispatcher.addListener(event.suite.after, this.suiteFinished.bind(this));

    event.dispatcher.addListener(event.test.started, this.testStarted.bind(this));
    event.dispatcher.addListener(event.test.skipped, this.testSkipped.bind(this));
    event.dispatcher.addListener(event.test.passed, this.testPassed.bind(this));
    event.dispatcher.addListener(event.test.failed, this.testFailed.bind(this));

    event.dispatcher.addListener(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.addListener(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.addListener(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.addListener(event.step.finished, this.stepFinished.bind(this));
  }

  createTest(test: CodeceptTest) {
    const suite = test.parent!;
    const group = this.ensureAllureGroupCreated(suite);
    const allureTest = group.startTest(test.title);
    allureTest.addLabel(LabelName.LANGUAGE, "javascript");
    allureTest.addLabel(LabelName.FRAMEWORK, "codeceptjs");

    const relativeFile = path.relative(codecept_dir, test.file!).split(path.sep).join("/");
    const fullName = `${relativeFile}#${test.title}`;

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
  }

  suiteFinished(suite: CodeceptSuite) {
    const group = this.allureGroupCache.get(suite);
    group?.endGroup();
  }

  testStarted(test: CodeceptTest) {
    this.currentTest = test;
  }

  testFailed(test: CodeceptTest, err: CodeceptError) {
    const allureTest = this.allureTestCache.get(test);
    if (allureTest) {
      allureTest.statusDetails = { message: stripAscii(err.cliMessage()) };
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.FAILED;
      allureTest.endTest();
    }
  }

  testPassed(test: CodeceptTest) {
    const allureTest = this.allureTestCache.get(test);
    if (allureTest) {
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.PASSED;
      allureTest.endTest();
    }
  }

  testSkipped(test: CodeceptTest) {
    const allureTest = this.allureTestCache.get(test);
    if (allureTest) {
      allureTest.stage = Stage.FINISHED;
      allureTest.status = Status.SKIPPED;
      allureTest.endTest();
    }
  }

  testAfter() {
    this.currentTest = null;
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
    const parents = [...this.getStepParents(step), step];
    let lastParent = (parents.length > 0 && this.allureStepCache.get(parents[0])) || null;

    parents.forEach((parentStep) => {
      if (!lastParent) {
        const allureTest = this.allureTestCache.get(this.currentTest!);
        if (allureTest) {
          const allureStep = allureTest.startStep(parentStep.toString());
          this.allureStepCache.set(parentStep, allureStep);
          lastParent = allureStep;
        }
      } else {
        const allureStep =
          this.allureStepCache.get(parentStep) || lastParent.startStep(parentStep.toString());
        this.allureStepCache.set(parentStep, allureStep);
        lastParent = allureStep;
      }
    });
  }

  stepFailed(step: CodeceptStep) {
    const allureStep = this.allureStepCache.get(step);

    if (allureStep) {
      allureStep.status = Status.FAILED;
      allureStep.endStep();
    }
  }

  stepPassed(step: CodeceptStep) {
    const allureStep = this.allureStepCache.get(step);
    if (allureStep) {
      allureStep.status = Status.PASSED;
      allureStep.endStep();
    }
  }

  stepFinished(step: CodeceptStep) {
    const parentStep = this.getStepParents(step)[0];
    const allureStep = this.allureStepCache.get(parentStep);
    if (allureStep?.isAllStepsEnded) {
      if (allureStep.isAnyStepFailed) {
        allureStep.status = Status.FAILED;
      } else {
        allureStep.status = Status.PASSED;
      }
      allureStep.endStep();
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

  addLabel(name: string, value: string) {
    if (this.currentTest) {
      const allureTest = this.allureTestCache.get(this.currentTest);
      allureTest?.addLabel(name, value);
    }
  }

  severity = (severity: string) => {
    this.addLabel("severity", severity);
  };

  epic = (epic: string) => {
    this.addLabel("epic", epic);
  };

  feature = (feature: string) => {
    this.addLabel("feature", feature);
  };

  story = (story: string) => {
    this.addLabel("story", story);
  };

  issue(issue: string) {
    this.addLabel("issue", issue);
  }
}

const allurePlugin = (config: { outputDir: string }) => {
  return new AllureReporter(config);
};

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", // eslint-disable-line no-control-regex
  "g",
);

const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

export = allurePlugin;
