import {
  AllureInterface,
  AllureStep,
  AllureTest,
  ContentType,
  ExecutableItemWrapper,
  GlobalInfoWriter,
  isPromise,
  LabelName,
  Severity
} from 'allure2-js-commons';
import { AllureReporter } from './AllureReporter';
import { StepWrapper } from './StepWrapper';

export class MochaAllureInterface extends AllureInterface {
  constructor(private readonly reporter: AllureReporter) {
    super();
  }

  public setDescription(text: string) {
    this.currentTest.description = text;
    this.currentTest.descriptionHtml = text;
  }

  public setFlaky() {
    this.currentExecutable.detailsFlaky = true;
  }

  public setKnown() {
    this.currentExecutable.detailsKnown = true;
  }

  public setMuted() {
    this.currentExecutable.detailsMuted = true;
  }

  public addOwner(owner: string) {
    this.currentTest.addLabel(LabelName.OWNER, owner);
  }

  public setSeverity(severity: Severity) {
    this.currentTest.addLabel(LabelName.SEVERITY, severity);
  }

  public addIssue(issue: string) {
    this.currentTest.addLabel(LabelName.ISSUE, issue);
  }

  public addTag(tag: string) {
    this.currentTest.addLabel(LabelName.TAG, tag);
  }

  public addTestType(type: string) {
    this.currentTest.addLabel(LabelName.TEST_TYPE, type);
  }

  public addLink(name: string, url: string, type?: string) {
    this.currentTest.addLink(name, url, type);
  }

  public step<T>(name: string, body: () => any): any {
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

  public attachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentExecutable.addAttachment(name, type, file);
  }

  public testAttachment(name: string, content: Buffer | string, type: ContentType) {
    const file = this.reporter.writeAttachment(content, type);
    this.currentTest.addAttachment(name, type, file);
  }

  public addParameter(name: string, value: string): void {
    this.currentTest.addParameter(name, value);
  }

  public addLabel(name: string, value: string): void {
    this.currentTest.addLabel(name, value);
  }

  public getGlobalInfoWriter(): GlobalInfoWriter {
    return this.reporter.getGlobalInfoWriter();
  }

  private startStep(name: string): StepWrapper {
    const allureStep: AllureStep = this.currentExecutable.startStep(name);
    this.reporter.pushStep(allureStep);
    return new StepWrapper(this.reporter, allureStep);
  }

  private get currentTest(): AllureTest {
    if (this.reporter.currentTest === null) {
      throw new Error('No test running!');
    }
    return this.reporter.currentTest;
  }

  private get currentExecutable(): ExecutableItemWrapper {
    const executable = this.reporter.currentStep || this.reporter.currentTest;
    if (executable === null) {
      throw new Error('No executable!');
    }
    return executable;
  }
}
