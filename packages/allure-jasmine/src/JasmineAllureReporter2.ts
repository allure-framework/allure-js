import {
  Allure2,
  AllureLiveCycle,
  IAllureConfig,
  LabelName,
  Status,
  StepResult,
  StepWrapper,
  TestResult
} from "allure-js-commons";
import { getAllureStatusDetails, getAllureTestStatus } from "./utils";
import { Wrapper } from "allure-js-commons/dist/src/Allure2";

type JasmineHookName = "beforeAll" | "beforeEach" | "afterEach" | "afterAll"
const jasmineBeforeHookNames: JasmineHookName[] = ["beforeAll", "beforeEach"];
const jasmineAfterHookNames: JasmineHookName[] = ["afterEach", "afterAll"];
const jasmineHookNames: JasmineHookName[] = [...jasmineBeforeHookNames, ...jasmineAfterHookNames];

export class JasmineAllureReporter2 implements jasmine.CustomReporter {
  private readonly allureInterface: JasmineAllureInterface;
  private readonly allureLiveCycle: AllureLiveCycle;
  private beforeAll = global.beforeAll;
  private beforeEach = global.beforeEach;
  private afterEach = global.afterEach;
  private afterAll = global.afterAll;
  public currentSpecResult?: jasmine.SpecResult;

  constructor(config: IAllureConfig) {
    this.allureLiveCycle = new AllureLiveCycle(config);
    this.allureInterface = new JasmineAllureInterface(this.allureLiveCycle, this);
    jasmineHookNames.forEach(hookName => {
      global[hookName] = (action: jasmine.ImplementationCallback, timeout?: number) => {
        const hookWrapper = new JasmineHookWrapper(this.allureLiveCycle, hookName);
        const wrapped = hookWrapper.wrap(action);
        this[hookName](wrapped, timeout);
      };
    });
  }

  getInterface(): Allure2 {
    return this.allureInterface;
  }

  suiteStarted(result: jasmine.SuiteResult) {
    this.allureLiveCycle.startTestContainer(container => {
      container.name = result.fullName;
    });
  }

  suiteDone(result: jasmine.SuiteResult) {
    this.allureLiveCycle.stopTestContainer();
  }

  specStarted(result: jasmine.SpecResult): void {
    this.currentSpecResult = result;
    this.allureLiveCycle.scheduleTest();
    this.allureLiveCycle.startTest((testResult: Partial<TestResult>) => {
      testResult.name = result.description;
      testResult.fullName = result.fullName;
    });
    this.allureInterface.label(LabelName.FRAMEWORK, "Jasmine");
    this.allureInterface.label(LabelName.LANGUAGE, "js/ts");
  }

  specDone(result: jasmine.SpecResult): void {
    this.allureLiveCycle.stopTest((testResult: Partial<TestResult>) => {
      testResult.status = getAllureTestStatus(result);
      testResult.statusDetails = getAllureStatusDetails(result);
    });
    this.allureLiveCycle.writeTest();
  }

  jasmineDone(): void {
    jasmineHookNames.forEach(hookName => {
      global[hookName] = this[hookName];
    });
  }
}

class JasmineAllureInterface extends Allure2 {
  constructor(allureLiveCycle: AllureLiveCycle, private reporter: JasmineAllureReporter2) {
    super(allureLiveCycle);
  }

  public step<T>(name: string, body: (stepContext: StepWrapper) => T): T {
    const stepWrapper = new JasmineStepWrapper(this.allureLiveCycle, this.reporter.currentSpecResult);
    return stepWrapper.step(name, body);
  }
}

class JasmineStepWrapper extends StepWrapper {
  private readonly failedExpectationsCount;

  constructor(protected allureLiveCycle: AllureLiveCycle,
              protected currentSpecResult?: jasmine.SpecResult,
              protected parentUUID?: string) {
    super(allureLiveCycle, parentUUID);
    this.failedExpectationsCount = this.currentSpecResult?.failedExpectations.length;
  }

  public step(name: string, body: (i: StepWrapper) => void) {
    this.uuid = this.allureLiveCycle.startStep((stepResult: Partial<StepResult>) => {
      stepResult.name = name;
    }, this.parentUUID);

    const stepWrapper = new JasmineStepWrapper(this.allureLiveCycle, this.currentSpecResult, this.uuid);
    const step = this.wrap(body);
    return step(stepWrapper);
  }

  protected done(): void {
    if (this.currentSpecResult?.failedExpectations.length != this.failedExpectationsCount) {
      this.allureLiveCycle.stopStep(stepResult => {
        stepResult.status = Status.FAILED;
        stepResult.statusDetails = getAllureStatusDetails(this.currentSpecResult, this.failedExpectationsCount);
      }, this.uuid);
    } else {
      super.done();
    }
  }
}

class JasmineHookWrapper extends Wrapper {
  uuid?: string;

  constructor(protected allureLiveCycle: AllureLiveCycle, protected hookName: JasmineHookName) {
    super();
  }

  protected run(fn: (...args: any[]) => any, ...args: any[]): any {
    const fixtureKind = jasmineBeforeHookNames.indexOf(this.hookName) >= 0 ? "befores" : "afters";
    this.uuid = this.allureLiveCycle.startFixture(fixtureKind, fixtureResult => {
      fixtureResult.name = this.hookName;
    });
    return super.run(fn, ...args);
  }

  protected done(value?: any): void {
    this.allureLiveCycle.stopFixture(fixtureResult => {
      fixtureResult.status = Status.PASSED;
    }, this.uuid);
    super.done(value);
  }
  protected fail(error?: Error): void {
    this.allureLiveCycle.stopFixture(fixtureResult => {
      fixtureResult.status = Status.FAILED;
      console.log(error);
    }, this.uuid);
    super.fail(error);
  }

  public wrap(fn: (...args: any) => any): (...args: any) => any {
    return super.wrap(fn);
  }
}
