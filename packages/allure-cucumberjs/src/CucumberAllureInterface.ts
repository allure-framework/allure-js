import {
  Allure,
  AllureRuntime,
  AllureStep,
  AllureTest,
  AttachmentOptions,
  ContentType,
  ExecutableItemWrapper,
  isPromise,
  Status,
  StepInterface,
} from "allure-js-commons";
import { CucumberJSAllureFormatter } from "./CucumberJSAllureReporter";

export class CucumberAllureInterface extends Allure {
  constructor(private readonly reporter: CucumberJSAllureFormatter, runtime: AllureRuntime) {
    super(runtime);
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
    const file = this.runtime.writeAttachment(content, options);
    this.currentExecutable.addAttachment(name, options, file);
  }

  testAttachment(
    name: string,
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
  ): void {
    const file = this.runtime.writeAttachment(content, options);
    this.currentTest.addAttachment(name, options, file);
  }

  addParameter(name: string, value: string): void {
    this.currentTest.addParameter(name, value);
  }

  addLabel(name: string, value: string): void {
    this.currentTest.addLabel(name, value);
  }

  addIssueLink(url: string, name: string): void {
    this.currentTest.addIssueLink(url, name);
  }

  addTmsLink(url: string, name: string): void {
    this.currentTest.addTmsLink(url, name);
  }

  protected get currentExecutable(): ExecutableItemWrapper {
    // const result = this.reporter.currentStep || this.reporter.currentTest;
    // if (result === null) {
      throw new Error("No executable!");
    // }
    // return result;
  }

  protected get currentTest(): AllureTest {
    if (this.reporter.currentTest === null) {
      throw new Error("No test running!");
    }
    return this.reporter.currentTest;
  }

  private startStep(name: string): WrappedStep {
    const allureStep: AllureStep = this.currentExecutable.startStep(name);
    // this.reporter.pushStep(allureStep);
    return new WrappedStep(this.reporter, allureStep);
  }
}

export class WrappedStep {
  constructor(
    private readonly reporter: CucumberJSAllureFormatter,
    private readonly step: AllureStep,
  ) {}

  startStep(name: string): WrappedStep {
    const step = this.step.startStep(name);
    // this.reporter.pushStep(step);
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
    // this.reporter.popStep();
    this.step.endStep();
  }

  run<T>(body: (step: StepInterface) => T): T {
    return this.step.wrap(body)();
  }
}
