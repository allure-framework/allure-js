import {
  AllureGroup,
  Allure,
  AllureRuntime,
  AllureStep,
  AllureTest,
  ContentType,
  GlobalInfoWriter,
  LabelName,
  Stage,
  Status
} from "allure-js-commons";
import { createHash } from "crypto";
import { MochaAllureInterface } from "./MochaAllureInterface";

export class AllureReporter {
  private suites: AllureGroup[] = [];
  private steps: AllureStep[] = [];
  private runningTest: AllureTest | null = null;
  private runtime: AllureRuntime | null = null;

  public setupRuntime(path: string) {
    this.runtime = new AllureRuntime({ resultsDir: path });
  }

  public getInterface(): Allure {
    return new MochaAllureInterface(this);
  }

  public getGlobalInfoWriter(): GlobalInfoWriter {
    return this.runtime as GlobalInfoWriter;
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
    if (suiteName) {
      const scope = this.currentSuite || this.runtime;
      if (scope == null) {
        throw Error("Suite scope is not defined");
      }
      const suite = scope.startGroup(suiteName);
      this.pushSuite(suite);
    }
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

  public startCase(suiteName: string, testName: string) {
    if (this.currentSuite === null) {
      throw new Error("No active suite");
    }

    this.currentTest = this.currentSuite.startTest(testName);
    this.currentTest.fullName = testName;
    this.currentTest.historyId = createHash("md5")
      .update(JSON.stringify({ suite: suiteName, test: testName }))
      .digest("hex");
    this.currentTest.stage = Stage.RUNNING;
    this.currentTest.addLabel(LabelName.SUITE, this.currentSuite.name);
  }

  public passTestCase() {
    this.endTest();
  }

  public pendingTestCase(test: Mocha.Test) {
    if (this.currentTest === null && this.currentSuite !== null) {
      this.currentTest = this.currentSuite.startTest(test.title);
      this.currentTest.statusDetails = { message: "Test ignored" };
    }

    this.endTest(undefined, Status.SKIPPED);
  }

  public failTestCase(test: Mocha.Test, error: Error) {
    if (this.currentTest === null && this.currentSuite !== null) {
      this.currentTest = this.currentSuite.startTest(test.fullTitle());
    }

    this.endTest(error);
  }

  public writeAttachment(content: Buffer | string, type: ContentType): string {
    if (this.runtime == null) {
      throw Error("AllureReporter runtime is not defined");
    }
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

  private endTest(error?: Error, status?: Status): void {
    if (this.currentTest === null) {
      throw new Error("endTest while no test is running");
    }

    if (error) {
      this.currentTest.statusDetails = { message: error.message, trace: error.stack };
    }

    let errorStatus = Status.PASSED;
    if (error) errorStatus = error.name === "AssertionError" ? Status.FAILED : Status.BROKEN;

    this.currentTest.status = status || errorStatus;
    this.currentTest.stage = Stage.FINISHED;
    this.currentTest.endTest();
    this.currentTest = null;
  }
}
