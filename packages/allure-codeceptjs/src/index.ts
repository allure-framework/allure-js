import path from "path";
import {
  AllureGroup,
  AllureRuntime,
  AllureTest,
  LabelName,
  md5,
  Stage,
  Status,
} from "allure-js-commons";
import { allure } from "./helpers";
const { event } = global.codeceptjs;

interface CodeceptContext {}

interface CodeceptHook {}
interface CodeceptError {
  params: any;
  template: string;
  showDiff: boolean;
  actual: string;
  expected: string;
  cliMessage: () => string;
  inspect: () => string;
}

interface CodeceptTest {
  type: "test";
  title: string;
  retryNum?: number;
  fullTitle: () => string;
  opts: any;
  uid: string;
  parent: CodeceptSuite;
  ctx: CodeceptContext;
  fn: () => void;
  body: string;
  async: boolean;
  sync: boolean;
  _timeout: number;
  _slow: number;
  _retries: number;
  timedOut: boolean;
  _currentRetry: number;
  pending: boolean;
  tags: [];
  file: string;
  inject: any;
  steps: CodeceptStep[];
}

interface CodeceptStep {
  actor: string;
  name: string;
  helperMethod: string;
  suffix: string;
  prefix: string;
  comment: string;
  args: string[];
  status: "queued";
  metaStep?: CodeceptStep;
}

interface CodeceptSuite {
  fullTitle: () => string;
  tests: CodeceptTest[];
  ctx: CodeceptContext;
  suites: CodeceptSuite[];
  root: boolean;
  pending: boolean;
  _retries: number;
  _beforeEach: CodeceptHook[];
  _beforeAll: CodeceptHook[];
  _afterEach: CodeceptHook[];
  _afterAll: CodeceptHook[];
  _timeout: number;
  _slow: number;
  _bail: boolean;
  _onlyTests: [];
  _onlySuites: [];
  delayed: boolean;
  parent: CodeceptSuite;
  opts: any;
  tags: [];
  file: string;
}

class AllureReporter {
  currentMetaStep = [];
  currentStep?: CodeceptStep;
  allureRuntime?: AllureRuntime;
  allureGroupCache = new Map<CodeceptSuite, AllureGroup>();
  allureTestCache = new Map<CodeceptTest, AllureTest>();
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
    event.dispatcher.addListener(event.step.finished, this.stepFailed.bind(this));
  }

  createTest(test: CodeceptTest) {
    const suite = test.parent;
    const group = this.ensureAllureGroupCreated(suite);
    const allureTest = group.startTest(test.title);
    allureTest.addLabel(LabelName.LANGUAGE, "javascript");
    allureTest.addLabel(LabelName.FRAMEWORK, "codeceptjs");

    const relativeFile = path.relative(codecept_dir, test.file).split(path.sep).join("/");
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
    if (this.currentTest) {
      this.currentTest.steps = [];
      if (!("retryNum" in this.currentTest)) {
        this.currentTest.retryNum = 0;
      } else {
        this.currentTest.retryNum! += 1;
      }
    }
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

  stepStarted(step: CodeceptStep) {}
  stepCompleted(step: CodeceptStep) {}
  stepFailed(step: CodeceptStep) {}
  stepPassed(step: CodeceptStep) {}

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

allurePlugin.allure = allure;

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", // eslint-disable-line no-control-regex
  "g",
);

const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

export = allurePlugin;
