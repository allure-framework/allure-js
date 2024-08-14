import { event, recorder } from "codeceptjs";
import type * as Mocha from "mocha";
import { env } from "node:process";
import { LabelName, Stage, Status, type StepResult } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError, isMetadataTag } from "allure-js-commons/sdk";
import AllureMochaReporter from "allure-mocha";
import type { CodeceptError, CodeceptStep } from "./model.js";

export class AllureCodeceptJsReporter extends AllureMochaReporter {
  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions, isInWorker: boolean) {
    super(runner, opts, isInWorker);
    this.registerEvents();
  }

  registerEvents() {
    // Test
    event.dispatcher.on(event.test.before, this.testStarted.bind(this));
    // Step
    event.dispatcher.on(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.on(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.on(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.on(event.step.comment, this.stepComment.bind(this));
  }

  testStarted(test: { tags?: string[] }) {
    if (!this.currentTest) {
      return;
    }

    const tags = test.tags || [];
    const extraTagLabels = tags
      .filter((tag) => tag && !isMetadataTag(tag))
      .map((tag) => (tag.startsWith("@") ? tag.substring(1) : tag))
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .map((tag) => ({ name: LabelName.TAG, value: tag }));

    this.runtime.updateTest(this.currentTest, (tr) => {
      tr.labels.push(...extraTagLabels);
    });
  }

  stepStarted(step: CodeceptStep) {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }
    this.runtime.startStep(root, undefined, {
      name: `${step.actor} ${step.name}`,
      parameters: step.args?.map((arg, index) => ({ name: `arg${index}`, value: `${arg}` })),
    });
  }

  // according to the docs, codeceptjs supposed to report the error,
  // but actually it's never reported
  stepFailed(_: CodeceptJS.Step, error?: CodeceptError) {
    this.stopCurrentStep((result) => {
      result.stage = Stage.FINISHED;
      if (error) {
        result.status = getStatusFromError({ message: error.message } as Error);
        result.statusDetails = getMessageAndTraceFromError(error);
      } else {
        result.status = env.TRY_TO === "true" ? Status.BROKEN : Status.FAILED;
      }
    });
  }

  stepComment() {
    this.stopCurrentStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
  }

  stepPassed() {
    this.stopCurrentStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
  }

  stopCurrentStep(updateFunc: (result: StepResult) => void) {
    const root = this.currentHook ?? this.currentTest;
    const currentStep = root ? this.runtime.currentStep(root) : undefined;

    if (!currentStep) {
      return;
    }
    const promise = recorder.promise();
    // @ts-ignore
    if (promise) {
      promise.catch((err) => {
        if (err instanceof Error) {
          this.runtime.updateStep(currentStep, (step) => {
            step.status = getStatusFromError(err);
            step.statusDetails = { ...step.statusDetails, ...getMessageAndTraceFromError(err) };
          });
        }
        return Promise.reject(err);
      });
    }

    this.runtime.updateStep(currentStep, updateFunc);
    this.runtime.stopStep(currentStep);
  }

  protected getFrameworkName = () => "codeceptjs";

  protected getWorkerId = () => undefined;
}
