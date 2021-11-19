import { createHash } from "crypto";
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  AttachmentOptions,
  ContentType,
  ExecutableItemWrapper,
  LabelName,
  Stage,
  Status,
  StatusDetails,
} from "allure-js-commons";
import { MochaAllure } from "./MochaAllure";

export class AllureReporter {
  public currentExecutable: ExecutableItemWrapper | null = null;

  private suites: AllureGroup[] = [];
  private steps: AllureStep[] = [];
  private runningTest: AllureTest | null = null;

  constructor(private readonly allureRuntime: AllureRuntime) {}

  public getImplementation(): MochaAllure {
    return new MochaAllure(this, this.allureRuntime);
  }

  get currentSuite(): AllureGroup | null {
    return this.suites.length > 0 ? this.suites[this.suites.length - 1] : null;
  }

  get currentStep(): AllureStep | null {
    return this.steps.length > 0 ? this.steps[this.steps.length - 1] : null;
  }

  get currentTest(): AllureTest | null {
    return this.runningTest;
  }

  set currentTest(test: AllureTest | null) {
    this.runningTest = test;
  }

  public startSuite(suiteName: string): void {
    const scope: AllureGroup | AllureRuntime = this.currentSuite || this.allureRuntime;
    const suite: AllureGroup = scope.startGroup(suiteName || "Global");
    this.pushSuite(suite);
  }

  public endSuite(): void {
    if (this.currentSuite !== null) {
      if (this.currentStep !== null) {
        this.currentStep.endStep();
      }
      this.currentSuite.endGroup();
      this.popSuite();
    }
  }

  public startHook(hook: Mocha.Hook): void {
    const suite: AllureGroup | null = this.currentSuite;
    const title = hook.title;
    if (suite && title && title.includes("before")) {
      this.currentExecutable = suite.addBefore();
    } else if (suite && title && title.includes("after")) {
      this.currentExecutable = suite.addAfter();
    }

    if (this.currentExecutable) {
      this.currentExecutable.name = hook.originalTitle || hook.title;
    }
  }

  public endHook(error?: Error): void {
    if (this.currentExecutable) {
      this.currentExecutable.stage = Stage.FINISHED;

      if (error) {
        this.currentExecutable.status = Status.FAILED;
        this.currentExecutable.statusDetails = { message: error.message, trace: error.stack };
      } else {
        this.currentExecutable.status = Status.PASSED;
      }
    }
  }

  public startCase(test: Mocha.Test): void {
    if (this.currentSuite === null) {
      throw new Error("No active suite");
    }

    this.currentTest = this.currentSuite.startTest(test.title);
    this.currentTest.fullName = test.title;
    this.currentTest.historyId = createHash("md5").update(test.fullTitle()).digest("hex");
    this.currentTest.stage = Stage.RUNNING;

    if (test.parent) {
      const [parentSuite, suite, ...subSuites] = test.parent.titlePath();
      if (parentSuite) {
        this.currentTest.addLabel(LabelName.PARENT_SUITE, parentSuite);
      }
      if (suite) {
        this.currentTest.addLabel(LabelName.SUITE, suite);
      }
      if (subSuites.length > 0) {
        this.currentTest.addLabel(LabelName.SUB_SUITE, subSuites.join(" > "));
      }
    }
  }

  public passTestCase(test: Mocha.Test): void {
    if (this.currentTest === null) {
      this.startCase(test);
    }
    this.endTest(Status.PASSED);
  }

  public pendingTestCase(test: Mocha.Test): void {
    this.startCase(test);
    this.endTest(Status.SKIPPED, { message: "Test ignored" });
  }

  public failTestCase(test: Mocha.Test, error: Error): void {
    if (this.currentTest === null) {
      this.startCase(test);
    } else {
      const latestStatus = this.currentTest.status;
      // if test already has a failed state, we should not overwrite it
      if (latestStatus === Status.FAILED || latestStatus === Status.BROKEN) {
        return;
      }
    }
    const status = error.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

    this.endTest(status, { message: error.message, trace: error.stack });
  }

  public writeAttachment(
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): string {
    return this.allureRuntime.writeAttachment(content, options);
  }

  public pushStep(step: AllureStep): void {
    this.steps.push(step);
  }

  public popStep(): void {
    this.steps.pop();
  }

  public pushSuite(suite: AllureGroup): void {
    this.suites.push(suite);
  }

  public popSuite(): void {
    this.suites.pop();
  }

  private endTest(status: Status, details?: StatusDetails): void {
    if (this.currentTest === null) {
      throw new Error("endTest while no test is running");
    }

    if (details) {
      this.currentTest.statusDetails = details;
    }
    this.currentTest.status = status;
    this.currentTest.stage = Stage.FINISHED;
    this.currentTest.endTest();
    this.currentTest = null;
  }
}
