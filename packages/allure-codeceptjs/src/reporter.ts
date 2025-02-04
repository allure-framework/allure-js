import { event, recorder } from "codeceptjs";
import type * as Mocha from "mocha";
import { env } from "node:process";
import { LabelName, Stage, Status, type StepResult } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError, isMetadataTag, stripAnsi } from "allure-js-commons/sdk";
import AllureMochaReporter from "allure-mocha";
import type { CodeceptBddStep, CodeceptError, CodeceptStep } from "./model.js";

interface MetaStep {
  name: string;
  id: string;
}

const MAX_META_STEP_NESTING = 10;

export class AllureCodeceptJsReporter extends AllureMochaReporter {
  protected currentBddStep?: string;
  protected metaStepStack: MetaStep[] = [];

  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions, isInWorker: boolean) {
    super(runner, opts, isInWorker);
    this.registerEvents();
  }

  registerEvents() {
    // Test
    event.dispatcher.on(event.test.before, this.testStarted.bind(this));
    event.dispatcher.on(event.test.failed, this.testFailed.bind(this));
    event.dispatcher.on(event.test.finished, this.testFinished.bind(this));
    // Step
    event.dispatcher.on(event.step.started, this.stepStarted.bind(this));
    event.dispatcher.on(event.step.passed, this.stepPassed.bind(this));
    event.dispatcher.on(event.step.failed, this.stepFailed.bind(this));
    event.dispatcher.on(event.step.comment, this.stepComment.bind(this));

    event.dispatcher.on(event.bddStep.before, this.bddStepStarted.bind(this));
    event.dispatcher.on(event.bddStep.after, this.stepPassed.bind(this));
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

  testFailed(_: {}, error: Error) {
    const status = getStatusFromError({ message: error.message } as Error);
    const statusDetails = getMessageAndTraceFromError(error);
    if (this.currentBddStep) {
      this.stopCurrentStep((result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.BROKEN;
        if (error) {
          result.status = status;
          result.statusDetails = { ...statusDetails };
        }
      });
    }
    this.currentBddStep = undefined;

    for (const { id } of this.metaStepStack) {
      this.runtime.updateStep(id, (result) => {
        result.stage = Stage.FINISHED;
        result.status = Status.BROKEN;
        if (error) {
          result.status = status;
          result.statusDetails = { ...statusDetails };
        }
      });
      this.runtime.stopStep(id);
    }
    this.metaStepStack = [];
  }

  testFinished() {
    if (this.currentBddStep) {
      this.runtime.updateStep(this.currentBddStep, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(this.currentBddStep);
    }
    this.currentBddStep = undefined;

    for (const { id } of this.metaStepStack) {
      this.runtime.updateStep(id, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(id);
    }

    this.metaStepStack = [];
  }

  stepStarted(step: CodeceptStep) {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }

    const stepPath: string[] = [];
    let current = step.metaStep;
    while (current && !current.isBDD() && stepPath.length < MAX_META_STEP_NESTING) {
      stepPath.push(stripAnsi(current.toString() ?? "").trim());
      current = current.metaStep;
    }

    let index = 0;
    while (
      index < Math.min(this.metaStepStack.length, stepPath.length) &&
      this.metaStepStack[index].name === stepPath[index]
    ) {
      index++;
    }

    for (let i = index; i < this.metaStepStack.length; i++) {
      const id = this.metaStepStack[i].id;
      this.runtime.updateStep(id, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(id);
    }

    for (let i = index; i < stepPath.length; i++) {
      const name = stepPath[i];
      const id = this.runtime.startStep(root, undefined, {
        name,
      });
      if (id) {
        this.metaStepStack.push({ name, id });
      }
    }

    this.runtime.startStep(root, undefined, {
      name: step.toString().trim(),
    });
  }

  bddStepStarted(step: CodeceptBddStep) {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }
    this.currentBddStep = this.runtime.startStep(root, undefined, {
      name: step.keyword + step.text,
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

    this.stopStepById(currentStep, updateFunc);
  }

  stopStepById(currentStep: string | undefined, updateFunc: (result: StepResult) => void) {
    if (!currentStep) {
      return;
    }
    const promise = recorder.promise();
    // @ts-ignore
    if (promise) {
      promise.catch((err) => {
        if (!err.message && typeof err.inspect === "function") {
          // AssertionFailedError doesn't set message attribute
          err.message = err.inspect();
        }
        if (err instanceof Error || err.constructor.name === "Error") {
          this.runtime.updateStep(currentStep, (step) => {
            step.status = getStatusFromError(err as Error);
            step.statusDetails = { ...step.statusDetails, ...getMessageAndTraceFromError(err as Error) };
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
