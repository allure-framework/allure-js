import {
  Allure,
  AllureStep,
  AllureTest,
  ContentType,
  ExecutableItemWrapper,
  GlobalInfoWriter,
  isPromise,
  LabelName,
  Severity, Status, StepInterface
} from "allure-js-commons";
import { CucumberJSAllureFormatter } from "./CucumberJSAllureReporter";

export class CucumberAllureInterface extends Allure {
  constructor(private readonly reporter: CucumberJSAllureFormatter) {
    super();
  }

  protected get currentExecutable(): ExecutableItemWrapper {
    const result = this.reporter.currentStep || this.reporter.currentTest;
    if (result === null) throw new Error("No executable!");
    return result;
  }

  protected get currentTest(): AllureTest {
    if (this.reporter.currentTest === null) throw new Error("No test running!");
    return this.reporter.currentTest;
  }

  private startStep(name: string): WrappedStep {
    const allureStep: AllureStep = this.currentExecutable.startStep(name);
    this.reporter.pushStep(allureStep);
    return new WrappedStep(this.reporter, allureStep);
  }

  step<T>(name: string, body: (step: StepInterface) => any): any {
    const wrappedStep = this.startStep(name);
    let result;
    try {
      result = wrappedStep.run(body);
    } catch (err) {
      wrappedStep.endStep();
      throw err;
    }
    if (isPromise(result)) {
      const promise = result as Promise<any>;
      return promise.then(a => {
        wrappedStep.endStep();
        return a;
      }).catch(e => {
        wrappedStep.endStep();
        throw e;
      });
    } else {
      wrappedStep.endStep();
      return result;
    }
  }

  logStep(name: string, status?: Status): void {
    this.step(name, () => {}); // todo status
  }

  attachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, file);
  }

  testAttachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, file);
  }

  addParameter(name: string, value: string): void {
    this.currentTest.addParameter(name, value);
  }

  addLabel(name: string, value: string): void {
    this.currentTest.addLabel(name, value);
  }

  getGlobalInfoWriter(): GlobalInfoWriter {
    return this.reporter.getGlobalInfoWriter();
  }
}

export class WrappedStep {
  constructor(private readonly reporter: CucumberJSAllureFormatter,
              private readonly step: AllureStep) {
  }

  startStep(name: string): WrappedStep {
    const step = this.step.startStep(name);
    this.reporter.pushStep(step);
    return new WrappedStep(this.reporter, step);
  }

  endStep(): void {
    this.reporter.popStep();
    this.step.endStep();
  }

  run<T>(body: (step: StepInterface) => T): T {
    return this.step.wrap(body)();
  }
}
