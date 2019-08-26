import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  LabelName,
  Stage,
  Status,
  StatusDetails
} from "allure-js-commons";
import { createHash } from "crypto";
import { MochaAllureInterface } from "./MochaAllureInterface";

export class AllureReporter {
  private suites: AllureGroup[] = [];
  private steps: AllureStep[] = [];
  private runningTest: AllureTest | null = null;

  constructor(private runtime: AllureRuntime) {}

  public getInterface(): MochaAllureInterface {
    return new MochaAllureInterface(this, this.runtime);
  }

  get currentSuite(): AllureGroup | null {
    if (this.suites.length === 0) {
      return null;
    }
    return this.suites[this.suites.length - 1];
  }

  get currentStep(): AllureStep | null {
    if (this.steps.length > 0) {
      return this.steps[this.steps.length - 1];
    }
    return null;
  }

  get currentTest(): AllureTest | null {
    return this.runningTest;
  }

  set currentTest(test: AllureTest | null) {
    this.runningTest = test;
  }

  public startSuite(suiteName: string) {
    const scope = this.currentSuite || this.runtime;
    const suite = scope.startGroup(suiteName || "Global");
    this.pushSuite(suite);
  }

  public endSuite() {
    if (this.currentSuite !== null) {
      if (this.currentStep !== null) {
        this.currentStep.endStep();
      }
      this.currentSuite.endGroup();
      this.popSuite();
    }
  }

  public startCase(test: Mocha.Test) {
    if (this.currentSuite === null) {
      throw new Error("No active suite");
    }

    this.currentTest = this.currentSuite.startTest(test.title);
    this.currentTest.fullName = test.name;
    this.currentTest.historyId = createHash("md5")
      .update(test.fullTitle())
      .digest("hex");
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

  public passTestCase(test: Mocha.Test) {
    if (this.currentTest === null) {
      this.startCase(test);
    }
    this.endTest(Status.PASSED);
  }

  public pendingTestCase(test: Mocha.Test) {
    this.startCase(test);
    this.endTest(Status.SKIPPED, { message: "Test ignored" });
  }

  public failTestCase(test: Mocha.Test, error: Error) {
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

  public writeAttachment(content: Buffer | string, type: ContentType): string {
    return this.runtime.writeAttachment(content, type);
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
  }
}
