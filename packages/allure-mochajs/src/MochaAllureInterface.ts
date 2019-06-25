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
import { AllureReporter } from "./AllureReporter";
import { StepWrapper } from "./StepWrapper";

export class MochaAllureInterface extends Allure {
  constructor(private readonly reporter: AllureReporter) {
    super();
  }

  public step<T>(name: string, body: (step: StepInterface) => any): any {
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
      return promise
        .then(a => {
          wrappedStep.endStep();
          return a;
        })
        .catch(e => {
          wrappedStep.endStep();
          throw e;
        });
    }
    wrappedStep.endStep();
    return result;
  }

  logStep(name: string, status?: Status): void {
    this.step(name, () => {}); // todo status
  }

  public attachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, file);
  }

  public testAttachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, file);
  }

  public getGlobalInfoWriter(): GlobalInfoWriter {
    return this.reporter.getGlobalInfoWriter();
  }

  private startStep(name: string): StepWrapper {
    const allureStep: AllureStep = this.currentExecutable.startStep(name);
    this.reporter.pushStep(allureStep);
    return new StepWrapper(this.reporter, allureStep);
  }

  protected get currentTest(): AllureTest {
    if (this.reporter.currentTest === null) {
      throw new Error("No test running!");
    }
    return this.reporter.currentTest;
  }

  protected get currentExecutable(): ExecutableItemWrapper {
    const executable = this.reporter.currentStep || this.reporter.currentTest;
    if (executable === null) {
      throw new Error("No executable!");
    }
    return executable;
  }
}
