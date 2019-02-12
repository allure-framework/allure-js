import {
  StatusDetails,
  StepResult,
  FixtureResult,
  TestResult,
  Status,
  Stage,
  ContentType
} from "./model";
import { isPromise } from "./isPromise";
import { stepResult } from "./constructors";

export class ExecutableItemWrapper {
  constructor(private readonly info: FixtureResult | TestResult) {
  }

  protected get wrappedItem(): FixtureResult | TestResult {
    return this.info;
  }

  public set name(name: string) {
    this.info.name = name;
  }

  public set description(description: string) {
    this.info.description = description;
  }

  public set descriptionHtml(descriptionHtml: string) {
    this.info.descriptionHtml = descriptionHtml;
  }

  public set status(status: Status) {
    this.info.status = status;
  }

  public set statusDetails(details: StatusDetails) {
    this.info.statusDetails = details;
  }

  public set detailsMessage(message: string) {
    this.info.statusDetails.message = message;
  }

  public set detailsTrace(trace: string) {
    this.info.statusDetails.trace = trace;
  }

  public set detailsMuted(muted: boolean) {
    this.info.statusDetails.muted = muted;
  }

  public set detailsKnown(known: boolean) {
    this.info.statusDetails.known = known;
  }

  public set detailsFlaky(flaky: boolean) {
    this.info.statusDetails.flaky = flaky;
  }

  public set stage(stage: Stage) {
    this.info.stage = stage;
  }

  public addParameter(name: string, value: string) {
    this.info.parameters.push({ name, value });
  }

  public addAttachment(name: string, type: ContentType, fileName: string) {
    this.info.attachments.push({ name, type, source: fileName });
  }

  public startStep(name: string): AllureStep {
    const result = stepResult();
    this.info.steps.push(result);

    const allureStep = new AllureStep(result);
    allureStep.name = name;
    return allureStep;
  }

  public wrap<T>(fun: (...args: any[]) => any) {
    return (...args: any[]) => {
      this.stage = Stage.RUNNING;
      let result;
      try {
        result = fun(args);
      } catch (error) {
        this.stage = Stage.INTERRUPTED; // fixme is this right for exception?
        this.status = Status.BROKEN;
        if (error) {
          this.detailsMessage = (error as Error).message || "";
          this.detailsTrace = (error as Error).stack || "";
        }
        throw error;
      }
      if (isPromise(result)) {
        const promise = result as Promise<any>;
        return promise.then(res => {
          this.status = Status.PASSED;
          this.stage = Stage.FINISHED;
          return res;
        }).catch(error => {
          this.stage = Stage.INTERRUPTED; // fixme is this right for exception?
          this.status = Status.BROKEN;
          if (error) {
            this.detailsMessage = (error as Error).message || "";
            this.detailsTrace = (error as Error).stack || "";
          }
          throw error;
        });
      } else {
        this.status = Status.PASSED;
        this.stage = Stage.FINISHED;
        return result;
      }
    };
  }
}

// This class is here because of circular dependency with ExecutableItemWrapper
export class AllureStep extends ExecutableItemWrapper {
  constructor(private readonly stepResult: StepResult) {
    super(stepResult);
    this.stepResult.start = Date.now();
  }

  endStep() {
    this.stepResult.stop = Date.now();
    // TODO: test that child steps ended
  }
}
