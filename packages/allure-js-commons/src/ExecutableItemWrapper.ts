import { stepResult } from "./constructors";
import { isPromise } from "./isPromise";
import {
  AttachmentOptions,
  ContentType,
  ExecutableItem,
  FixtureResult,
  ParameterOptions,
  Stage,
  Status,
  StatusDetails,
  StepResult,
  TestResult,
} from "./model";
import { isAllStepsEnded, isAnyStepFailed } from "./utils";

export class ExecutableItemWrapper {
  constructor(private readonly info: FixtureResult | TestResult) {}

  get wrappedItem(): FixtureResult | TestResult {
    return this.info;
  }

  public set name(name: string) {
    this.info.name = name;
  }

  public set description(description: string | undefined) {
    this.info.description = description;
  }

  public set descriptionHtml(descriptionHtml: string | undefined) {
    this.info.descriptionHtml = descriptionHtml;
  }

  public set status(status: Status | undefined) {
    this.info.status = status;
  }

  public get status(): Status | undefined {
    return this.info.status;
  }

  public set statusDetails(details: StatusDetails) {
    this.info.statusDetails = details;
  }

  public set detailsMessage(message: string | undefined) {
    this.info.statusDetails.message = message;
  }

  public set detailsTrace(trace: string | undefined) {
    this.info.statusDetails.trace = trace;
  }

  public set stage(stage: Stage) {
    this.info.stage = stage;
  }

  public parameter(name: string, value: any, options?: ParameterOptions): void {
    this.info.parameters.push({ ...options, name, value: JSON.stringify(value) });
  }

  public get isAnyStepFailed() {
    return isAnyStepFailed(this.info);
  }

  public get isAllStepsEnded() {
    return isAllStepsEnded(this.info);
  }

  /**
   * @deprecated use parameter() instead.
   */
  public addParameter(name: string, value: string, options?: ParameterOptions): void {
    this.parameter(name, value, options);
  }

  public addAttachment(
    name: string,
    options: ContentType | string | AttachmentOptions,
    fileName: string,
  ): void {
    if (typeof options === "string") {
      options = { contentType: options };
    }
    this.info.attachments.push({ name, type: options.contentType, source: fileName });
  }

  public startStep(name: string, start?: number): AllureStep {
    const result = stepResult();
    this.info.steps.push(result);

    const allureStep = new AllureStep(result, start);
    allureStep.name = name;
    return allureStep;
  }

  public wrap<T>(fun: (...args: any[]) => T) {
    return (...args: any[]): T => {
      this.stage = Stage.RUNNING;
      let result;
      try {
        result = fun(args);
      } catch (error) {
        this.stage = Stage.INTERRUPTED;
        this.status = Status.BROKEN;
        if (error) {
          this.detailsMessage = (error as Error).message || "";
          this.detailsTrace = (error as Error).stack || "";
        }
        throw error;
      }
      if (isPromise(result)) {
        const promise = result as any as Promise<any>;
        return promise
          .then((res) => {
            this.status = Status.PASSED;
            this.stage = Stage.FINISHED;
            return res;
          })
          .catch((error) => {
            this.stage = Stage.INTERRUPTED;
            this.status = Status.BROKEN;
            if (error) {
              this.detailsMessage = (error as Error).message || "";
              this.detailsTrace = (error as Error).stack || "";
            }
            throw error;
          }) as any as T;
      } else {
        this.status = Status.PASSED;
        this.stage = Stage.FINISHED;
        return result;
      }
    };
  }

  public addStep(step: ExecutableItem): void {
    this.info.steps.push(step);
  }
}

// This class is here because of circular dependency with ExecutableItemWrapper
export class AllureStep extends ExecutableItemWrapper {
  // eslint-disable-next-line no-shadow
  constructor(private readonly stepResult: StepResult, start: number = Date.now()) {
    super(stepResult);
    this.stepResult.start = start;
  }

  endStep(stop: number = Date.now()): void {
    this.stepResult.stop = stop;
  }
}
