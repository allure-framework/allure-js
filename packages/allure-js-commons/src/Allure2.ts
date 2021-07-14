import { AllureLiveCycle } from "./AllureLiveCycle";
import { LabelName, Status, StepResult, TestResult } from "./model";
import { isPromise } from "./isPromise";

export abstract class Allure2 {
  protected constructor(protected allureLiveCycle: AllureLiveCycle) {
    this.allureLiveCycle = allureLiveCycle;
  }

  public epic(epic: string) {
    this.label(LabelName.EPIC, epic);
  }

  public feature(feature: string) {
    this.label(LabelName.FEATURE, feature);
  }

  public story(story: string) {
    this.label(LabelName.STORY, story);
  }

  public suite(name: string) {
    this.label(LabelName.SUITE, name);
  }

  public parentSuite(name: string) {
    this.label(LabelName.PARENT_SUITE, name);
  }

  public subSuite(name: string) {
    this.label(LabelName.SUB_SUITE, name);
  }

  public label(name: string, value: string): void {
    this.allureLiveCycle.updateTest((testResult: Partial<TestResult>) => {
      testResult.labels = [...(testResult.labels || []), { name, value }];
    });
  }

  public step<T>(name: string, body: (stepContext: StepWrapper) => T): T {
    const stepWrapper = new StepWrapper(this.allureLiveCycle);
    return stepWrapper.step(name, body);
  }
}

export abstract class Wrapper {
  protected run(fn: (...args: any[]) => any, ...args: any[]) {
    return fn(...args);
  }

  protected done(value?: any) {
  }

  protected fail(error?: Error) {
  }

  protected wrap(fn: (...args: any[]) => any): (...args: any[]) => any {
    return (...args: any[]) => {
      let result;
      try {
        result = this.run(fn, ...args);
        if (isPromise(result)) {
          (result as Promise<any>)
            ?.then(this.done)
            ?.catch(this.fail);
        } else {
          this.done(result);
        }
        return result;
      } catch (error) {
        this.fail(error);
        throw error;
      }
    };
  }
}

export class StepWrapper extends Wrapper {
  uuid?: string;

  constructor(protected allureLiveCycle: AllureLiveCycle, protected parentUUID?: string) {
    super();
  }

  public step(name: string, body: (i: StepWrapper) => void) {
    this.uuid = this.allureLiveCycle.startStep((stepResult: Partial<StepResult>) => {
      stepResult.name = name;
    }, this.parentUUID);

    const stepWrapper = new StepWrapper(this.allureLiveCycle, this.uuid);
    const step = this.wrap(body);
    return step(stepWrapper);
  }

  protected done(value?: any) {
    this.allureLiveCycle.stopStep((stepResult: Partial<StepResult>) => {
      stepResult.status = Status.PASSED;
    }, this.uuid);
  }

  protected fail(error?: Error) {
    this.allureLiveCycle.updateStep((stepResult: Partial<StepResult>) => {
      stepResult.status = Status.FAILED;
      stepResult.statusDetails = {
        message: error?.message,
        trace: error?.stack
      };
    }, this.uuid);
  }
}
