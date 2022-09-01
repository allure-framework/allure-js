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
    throw new Error("Use CucumberAllureWorld step method to use the functionality!");
  }

  logStep(name: string, status?: Status): void {
    throw new Error("Use CucumberAllureWorld step method to use the functionality!");
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
}
