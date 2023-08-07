import {
  Allure,
  AllureConfig,
  AllureGroup,
  AllureRuntime,
  AllureStep,
  AllureTest,
  AttachmentOptions,
  ContentType,
  ExecutableItemWrapper,
  getSuitesLabels,
  isPromise,
  Label,
  Stage,
  Status,
  StepInterface,
} from "allure-js-commons";
// eslint-disable-next-line no-undef
import FailedExpectation = jasmine.FailedExpectation;

const findAnyError = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  expectations = expectations || [];
  if (expectations.length > 0) {
    return expectations[0];
  }
  return null;
};

const findMessageAboutThrow = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  for (const e of expectations || []) {
    if (e.matcherName === "") {
      return e;
    }
  }
  return null;
};

/* eslint-disable no-shadow */
enum SpecStatus {
  PASSED = "passed",
  FAILED = "failed",
  BROKEN = "broken",
  PENDING = "pending",
  DISABLED = "disabled",
  EXCLUDED = "excluded",
}

type JasmineBeforeAfterFn = (action: (done: DoneFn) => void, timeout?: number) => void;

export class JasmineAllureReporter implements jasmine.CustomReporter {
  private groupStack: AllureGroup[] = [];
  private labelStack: Label[][] = [[]];
  private runningTest: AllureTest | null = null;
  private stepStack: AllureStep[] = [];
  private runningExecutable: ExecutableItemWrapper | null = null;
  private readonly runtime: AllureRuntime;

  constructor(config: AllureConfig) {
    this.runtime = new AllureRuntime(config);
    this.installHooks();
  }

  get currentGroup(): AllureGroup {
    const currentGroup = this.getCurrentGroup();
    if (currentGroup === null) {
      throw new Error("No active group");
    }
    return currentGroup;
  }

  getInterface(): Allure {
    return new JasmineAllureInterface(this, this.runtime);
  }

  get currentTest(): AllureTest {
    if (this.runningTest === null) {
      throw new Error("No active test");
    }
    return this.runningTest;
  }

  get currentExecutable(): ExecutableItemWrapper | null {
    return this.runningExecutable;
  }

  writeAttachment(
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): string {
    return this.runtime.writeAttachment(content, options);
  }

  jasmineStarted(): void {}

  suiteStarted(suite: jasmine.CustomReporterResult): void {
    const name = suite.description;
    const group = (this.getCurrentGroup() || this.runtime).startGroup(name);

    this.groupStack.push(group);
    this.labelStack.push([]);
  }

  specStarted(spec: jasmine.CustomReporterResult): void {
    let currentGroup = this.getCurrentGroup();

    if (currentGroup === null) {
      throw new Error("No active suite");
    }

    currentGroup = currentGroup.startGroup("Test wrapper"); // needed to hold beforeEach/AfterEach
    this.groupStack.push(currentGroup);

    const name = spec.description;
    const allureTest = currentGroup.startTest(name);

    if (this.runningTest != null) {
      throw new Error("Test is starting before other ended!");
    }
    this.runningTest = allureTest;

    allureTest.fullName = spec.fullName;
    allureTest.historyId = spec.fullName;
    allureTest.stage = Stage.RUNNING;

    for (const labels of this.labelStack) {
      for (const label of labels) {
        allureTest.addLabel(label.name, label.value);
      }
    }
  }

  specDone(spec: jasmine.CustomReporterResult): void {
    const currentTest = this.runningTest;
    if (currentTest === null) {
      throw new Error("specDone while no test is running");
    }

    if (this.stepStack.length > 0) {
      // eslint-disable-next-line no-console
      console.error("Allure reporter issue: step stack is not empty on specDone");
      for (const step of this.stepStack.reverse()) {
        step.status = Status.BROKEN;
        step.stage = Stage.INTERRUPTED;
        step.detailsMessage = "Timeout";
        step.endStep();
      }
      this.stepStack = [];
    }

    if (
      spec.status === SpecStatus.PENDING ||
      spec.status === SpecStatus.DISABLED ||
      spec.status === SpecStatus.EXCLUDED
    ) {
      currentTest.status = Status.SKIPPED;
      currentTest.stage = Stage.PENDING;
      currentTest.detailsMessage = spec.pendingReason || "Suite disabled";
    }
    currentTest.stage = Stage.FINISHED;
    if (spec.status === SpecStatus.PASSED) {
      currentTest.status = Status.PASSED;
    }
    if (spec.status === SpecStatus.BROKEN) {
      currentTest.status = Status.BROKEN;
    }
    if (spec.status === SpecStatus.FAILED) {
      currentTest.status = Status.FAILED;
    }

    const exceptionInfo =
      findMessageAboutThrow(spec.failedExpectations) || findAnyError(spec.failedExpectations);
    if (exceptionInfo !== null) {
      currentTest.detailsMessage = exceptionInfo.message;
      currentTest.detailsTrace = exceptionInfo.stack;
    }

    currentTest.endTest();
    this.runningTest = null;

    this.currentGroup.endGroup(); // popping the test wrapper
    this.groupStack.pop();

    // need to add suites labels here because we need to remove test wrapper first
    getSuitesLabels(this.groupStack.map(({ name }) => name)).forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });
  }

  suiteDone(): void {
    if (this.runningTest !== null) {
      // eslint-disable-next-line no-console
      console.error("Allure reporter issue: running test on suiteDone");
    }

    const currentGroup = this.getCurrentGroup();
    if (currentGroup === null) {
      throw new Error("No active suite");
    }

    currentGroup.endGroup();
    this.groupStack.pop();
    this.labelStack.pop();
  }

  jasmineDone(): void {}

  addLabel(name: string, value: string): void {
    if (this.labelStack.length) {
      this.labelStack[this.labelStack.length - 1].push({ name, value });
    }
  }

  pushStep(step: AllureStep): void {
    this.stepStack.push(step);
  }

  popStep(): void {
    this.stepStack.pop();
  }

  get currentStep(): AllureStep | null {
    if (this.stepStack.length > 0) {
      return this.stepStack[this.stepStack.length - 1];
    }
    return null;
  }

  private getCurrentGroup(): AllureGroup | null {
    if (this.groupStack.length === 0) {
      return null;
    }
    return this.groupStack[this.groupStack.length - 1];
  }

  private installHooks(): void {
    const jasmineBeforeAll: JasmineBeforeAfterFn = global.beforeAll;
    const jasmineAfterAll: JasmineBeforeAfterFn = global.afterAll;
    const jasmineBeforeEach: JasmineBeforeAfterFn = global.beforeEach;
    const jasmineAfterEach: JasmineBeforeAfterFn = global.afterEach;

    const makeWrapperAll = (wrapped: JasmineBeforeAfterFn, fun: () => ExecutableItemWrapper) => {
      return (action: (done: DoneFn) => void, timeout?: number): void => {
        try {
          this.runningExecutable = fun();
        } catch {
          wrapped(action, timeout);
          return;
        }

        wrapped((done) => {
          let ret;
          if (action.length > 0) {
            // function takes done callback
            ret = this.runningExecutable!.wrap(
              () =>
                // eslint-disable-next-line no-undef
                new Promise((resolve, reject) => {
                  const t: any = resolve;
                  t.fail = reject;
                  action(t);
                }),
            )();
          } else {
            ret = this.runningExecutable!.wrap(action)();
          }
          if (isPromise(ret)) {
            (ret as Promise<any>)
              .then(() => {
                this.runningExecutable = null;
                done();
              })
              .catch((e) => {
                this.runningExecutable = null;
                done.fail(e);
              });
          } else {
            this.runningExecutable = null;
            done();
          }
        }, timeout);
      };
    };

    const wrapperBeforeAll = makeWrapperAll(jasmineBeforeAll, () => {
      return this.currentGroup.addBefore();
    });
    const wrapperAfterAll = makeWrapperAll(jasmineAfterAll, () => {
      return this.currentGroup.addAfter();
    });
    const wrapperBeforeEach = makeWrapperAll(jasmineBeforeEach, () => {
      return this.currentGroup.addBefore();
    });
    const wrapperAfterEach = makeWrapperAll(jasmineAfterEach, () => {
      return this.currentGroup.addAfter();
    });

    global.beforeAll = wrapperBeforeAll;
    global.afterAll = wrapperAfterAll;
    global.beforeEach = wrapperBeforeEach;
    global.afterEach = wrapperAfterEach;
  }
}

export class JasmineAllureInterface extends Allure {
  constructor(private readonly reporter: JasmineAllureReporter, runtime: AllureRuntime) {
    super(runtime);
  }

  label(name: string, value: string): void {
    try {
      this.reporter.currentTest.addLabel(name, value);
    } catch {
      this.reporter.addLabel(name, value);
    }
  }

  step<T>(name: string, body: (step: StepInterface) => T): T {
    const wrappedStep = this.startStep(name);
    let result;
    try {
      result = wrappedStep.run(body);
    } catch (err) {
      wrappedStep.setError(err as Error);
      wrappedStep.endStep();
      throw err;
    }
    if (isPromise(result)) {
      const promise = result as any as Promise<any>;
      return promise
        .then((a) => {
          wrappedStep.endStep();
          return a;
        })
        .catch((e: Error) => {
          wrappedStep.setError(e);
          wrappedStep.endStep();
          throw e;
        }) as any as T;
    } else {
      wrappedStep.endStep();
      return result;
    }
  }

  logStep(name: string, status?: Status): void {
    const step = this.startStep(name);
    step.setStatus(status);
    step.endStep();
  }

  attachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): void {
    const file = this.reporter.writeAttachment(content, options);
    this.currentExecutable.addAttachment(name, options, file);
  }

  testAttachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): void {
    const file = this.reporter.writeAttachment(content, options);
    this.currentTest.addAttachment(name, options, file);
  }

  protected get currentExecutable(): ExecutableItemWrapper {
    return (
      this.reporter.currentStep || this.reporter.currentExecutable || this.reporter.currentTest
    );
  }

  protected get currentTest(): AllureTest {
    return this.reporter.currentTest;
  }

  private startStep(name: string): WrappedStep {
    const allureStep: AllureStep = this.currentExecutable.startStep(name);
    this.reporter.pushStep(allureStep);
    return new WrappedStep(this.reporter, allureStep);
  }
}

class WrappedStep {
  // needed?
  constructor(
    private readonly reporter: JasmineAllureReporter,
    private readonly step: AllureStep,
  ) {}

  startStep(name: string): WrappedStep {
    const step = this.step.startStep(name);
    this.reporter.pushStep(step);
    return new WrappedStep(this.reporter, step);
  }

  setStatus(status?: Status): void {
    this.step.status = status;
  }

  setError(error: Error): void {
    this.step.status = Status.FAILED;
    this.step.detailsMessage = error.message;
    this.step.detailsTrace = error.stack;
  }

  endStep(): void {
    this.reporter.popStep();
    this.step.endStep();
  }

  run<T>(body: (step: StepInterface) => T): T {
    return this.step.wrap(body)();
  }
}
