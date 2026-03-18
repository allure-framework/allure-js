import { LabelName, Stage, Status, type StepResult } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError, isMetadataTag, stripAnsi } from "allure-js-commons/sdk";
import AllureMochaReporter from "allure-mocha";
import { event, recorder } from "codeceptjs";
import type * as Mocha from "mocha";

import type { CodeceptBddStep, CodeceptError, CodeceptStep } from "./model.js";

interface MetaStep {
  name: string;
  id: string;
}

const MAX_META_STEP_NESTING = 10;
// CodeceptJS tryTo() uses a dedicated "tryTo" recorder session.
// Docs: https://codecept.io/effects.html
const TRY_TO_SESSION = "tryTo";

const getCodeceptStatusFromError = (error: Partial<Error>, hookName?: string): Status => {
  const status = getStatusFromError(error);

  if (status === Status.FAILED || hookName) {
    return status;
  }

  return Status.FAILED;
};

const isTryToSession = () => recorder.getCurrentSessionId?.() === TRY_TO_SESSION;

export class AllureCodeceptJsReporter extends AllureMochaReporter {
  protected currentBddStep?: string;
  protected metaStepStack: MetaStep[] = [];
  protected currentLeafStep?: string;
  protected currentTestHookName?: string;

  constructor(runner: Mocha.Runner, opts: Mocha.MochaOptions, isInWorker: boolean) {
    super(runner, opts, isInWorker);
    this.registerEvents();
    runner.on("fail", this.mochaTestFailed.bind(this));
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

    this.currentTestHookName = undefined;

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

  testFailed(_: {}, error: Error, hookName?: string) {
    this.currentTestHookName = hookName;
    const status = getCodeceptStatusFromError(error, hookName);
    const statusDetails = getMessageAndTraceFromError(error);

    if (this.currentTest) {
      this.runtime.updateTest(this.currentTest, (result) => {
        result.status = status;
        result.statusDetails = {
          ...result.statusDetails,
          ...statusDetails,
        };
      });
    }

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
    this.currentTestHookName = undefined;
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
    this.currentLeafStep = undefined;
  }

  stepStarted(step: CodeceptStep) {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }

    const stepPath: string[] = [];
    let current = step.metaStep;
    while (current && !current.isBDD() && stepPath.length < MAX_META_STEP_NESTING) {
      stepPath.unshift(stripAnsi(current.toString() ?? "").trim());
      current = current.metaStep;
    }

    let index = 0;
    while (
      index < Math.min(this.metaStepStack.length, stepPath.length) &&
      this.metaStepStack[index].name === stepPath[index]
    ) {
      index++;
    }

    for (let i = this.metaStepStack.length - 1; i >= index; i--) {
      const { id } = this.metaStepStack[i];
      this.runtime.updateStep(id, (s) => {
        s.status = Status.PASSED;
        s.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(id);
    }
    this.metaStepStack = this.metaStepStack.slice(0, index);

    for (let i = index; i < stepPath.length; i++) {
      const name = stepPath[i];
      const parentId = this.metaStepStack[i - 1]?.id ?? root;
      const id = this.runtime.startStep(parentId, undefined, {
        name,
      });
      if (id) {
        this.metaStepStack.push({ name, id });
      }
    }

    const parent = this.metaStepStack[this.metaStepStack.length - 1]?.id ?? root;
    this.currentLeafStep = this.runtime.startStep(parent, undefined, {
      name: step.toString().trim(),
    });
  }

  bddStepStarted(step: CodeceptBddStep) {
    const root = this.currentHook ?? this.currentTest;
    if (!root) {
      return;
    }
    if (this.currentBddStep) {
      this.runtime.updateStep(this.currentBddStep, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(this.currentBddStep);
    }
    this.currentBddStep = this.runtime.startStep(root, undefined, {
      name: step.keyword + step.text,
    });
  }

  // according to the docs, codeceptjs supposed to report the error,
  // but actually it's never reported
  stepFailed(_: CodeceptJS.Step, error?: CodeceptError) {
    if (!this.currentLeafStep) {
      return;
    }

    this.runtime.updateStep(this.currentLeafStep, (result) => {
      result.stage = Stage.FINISHED;
      if (error) {
        if (!error.message && typeof error.inspect === "function") {
          error.message = error.inspect();
        }
        result.status = isTryToSession() ? Status.BROKEN : getCodeceptStatusFromError(error as unknown as Error);
        result.statusDetails = getMessageAndTraceFromError(error as unknown as Error);
      } else {
        result.status = isTryToSession() ? Status.BROKEN : Status.FAILED;
      }
    });
    this.runtime.stopStep(this.currentLeafStep);
    this.currentLeafStep = undefined;
  }

  stepComment() {
    this.stopCurrentStep((result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
  }

  stepPassed() {
    if (this.currentBddStep && !this.currentLeafStep) {
      this.runtime.updateStep(this.currentBddStep, (result) => {
        result.status = Status.PASSED;
        result.stage = Stage.FINISHED;
      });
      this.runtime.stopStep(this.currentBddStep);
      this.currentBddStep = undefined;
      return;
    }

    if (!this.currentLeafStep) {
      return;
    }

    this.runtime.updateStep(this.currentLeafStep, (result) => {
      result.status = Status.PASSED;
      result.stage = Stage.FINISHED;
    });
    this.runtime.stopStep(this.currentLeafStep);
    this.currentLeafStep = undefined;
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
            step.status = isTryToSession() ? Status.BROKEN : getCodeceptStatusFromError(err as Error);
            step.statusDetails = { ...step.statusDetails, ...getMessageAndTraceFromError(err as Error) };
          });
        }
        return Promise.reject(err);
      });
    }

    this.runtime.updateStep(currentStep, updateFunc);
    this.runtime.stopStep(currentStep);
  }

  mochaTestFailed(_: Mocha.Test, error: Error) {
    if (!this.currentTest) {
      return;
    }

    this.runtime.updateTest(this.currentTest, (result) => {
      result.status = getCodeceptStatusFromError(error, this.currentTestHookName);
      result.statusDetails = {
        ...result.statusDetails,
        ...getMessageAndTraceFromError(error),
      };
    });
  }

  protected getFrameworkName = () => "codeceptjs";

  protected getWorkerId = () => undefined;
}
