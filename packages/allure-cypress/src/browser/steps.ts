import type { StatusDetails } from "allure-js-commons";
import { Status } from "allure-js-commons";
import { getMessageAndTraceFromError, getStatusFromError } from "allure-js-commons/sdk";
import type {
  ApiStepDescriptor,
  CypressStepFinalizeMessage,
  LogStepDescriptor,
  StepDescriptor,
  StepFinalizer,
} from "../types.js";
import { popUntilFindIncluded } from "../utils.js";
import { reportStepStart, reportStepStop } from "./lifecycle.js";
import {
  clearStepsToFinalize,
  enqueueRuntimeMessage,
  getStepStack,
  getStepsToFinalize,
  popAllSteps,
  pushStep,
  setupStepFinalization,
} from "./state.js";
import { generateApiStepId } from "./utils.js";

export const ALLURE_STEP_CMD_SUBJECT = {};

export const isApiStep = (descriptor: StepDescriptor): descriptor is ApiStepDescriptor => {
  return descriptor.type === "api";
};

export const isLogStep = (descriptor: StepDescriptor): descriptor is LogStepDescriptor => {
  return descriptor.type === "log";
};

export const startAllureApiStep = (name: string) => reportStepStart(pushAllureStep(), name);

export const pushAllureStep = () => {
  const id = generateApiStepId();
  pushStep({ id, type: "api" });
  return id;
};

export const reportStepError = (error: Error) => {
  const status = getStatusFromError(error);
  const statusDetails = getMessageAndTraceFromError(error);

  // Cypress will abort the test/hook execution soon. No subsequent commands will be run, including the ones that
  // have been scheduled by `allure.step` to stop the currently running steps.
  // Additionally, we can't tell in advance if the current command log steps will be stopped normally or not.
  //
  // Given that, this function will stop all consecutive Allure API steps at the tip of the step stack.
  // The command log steps will be given a chance to stop normally to get the most correct timings.
  //
  // The command log steps that won't stop normally (and Allure API substeps thereof) will be stopped during the
  // test/hook finalization phase.
  stopAllureApiStepStackTip(status, statusDetails);

  // It's not guaranteed for command log steps and intermediate Allure API steps to have access to the error at the
  // moment they are stopped.
  // Additionally, Cypress may not update the stack trace of the error at that time. Until that happens, the stack
  // trace points deep in the bundled code, which is little to no use for the user. Therefore, we need to associate
  // the remaining steps with the error object to grab the updated stack trace later.
  associateErrorWithRunningSteps(error);
};

export const stopCurrentAllureApiStep = (status?: Status, statusDetails?: StatusDetails) =>
  findAndStopStepWithSubsteps((stepDescriptor) => isApiStep(stepDescriptor), status, statusDetails);

export const findAndStopStepWithSubsteps = (
  pred: (stepEntry: StepDescriptor) => boolean,
  status?: Status,
  statusDetails?: StatusDetails,
) => stopSelectedSteps(popUntilFindIncluded(getStepStack(), pred), status, statusDetails);

export const stopAllSteps = (status?: Status, statusDetails?: StatusDetails) =>
  stopSelectedSteps(popAllSteps(), status, statusDetails);

export const finalizeSteps = () => {
  // This will stop all dangling steps (like log groups with missing endGroup calls or logs that haven't been
  // finished by Cypress due to an error).
  stopAllSteps();

  getStepsToFinalize().forEach(finalizeOneStep);
  clearStepsToFinalize();
};

export const resolveStepStatus = (step: StepDescriptor) =>
  step.error ? getStatusFromError(step.error) : Status.PASSED;

const finalizeOneStep = ([step, finalizer]: [StepDescriptor, StepFinalizer | undefined]) => {
  const { id, error } = step;
  const data: CypressStepFinalizeMessage["data"] = { id };

  if (error) {
    // Cypress rewrites the stack trace of an error to point to the location in the test file. Until then, the stack
    // trace points inside the messy bundle, which is not helpful. There are circumstances when we can't be sure this
    // has happened when a step is about to stop. That's why we defer setting the status details until we are sure
    // Cypress does its job.
    data.statusDetails = getMessageAndTraceFromError(error);
  }

  finalizer?.(data);

  enqueueRuntimeMessage({
    type: "cypress_step_finalize",
    data,
  });
};

const stopAllureApiStepStackTip = (status: Status, statusDetails: StatusDetails) => {
  const stepStack = getStepStack();
  const firstApiStepAfterLastLogStep = stepStack.at(stepStack.findLastIndex(isLogStep) + 1);
  if (firstApiStepAfterLastLogStep) {
    findAndStopStepWithSubsteps(
      (logEntryOrMessage) => Object.is(logEntryOrMessage, firstApiStepAfterLastLogStep),
      status,
      statusDetails,
    );
  }
};

const propagateErrorToStepDescriptor = (step: StepDescriptor, errorOfSubstep: Error | undefined) => {
  if (isLogStep(step)) {
    const error = step.log.attributes.error;
    if (error) {
      return (step.error = error);
    }
  }

  if (errorOfSubstep) {
    step.error = errorOfSubstep;
  }

  return step.error;
};

const stopSelectedSteps = (steps: readonly StepDescriptor[], status?: Status, statusDetails?: StatusDetails) => {
  let error: Error | undefined;
  for (const stepEntry of steps) {
    error = propagateErrorToStepDescriptor(stepEntry, error);
    stopStep(stepEntry, status, statusDetails);
  }

  if (error) {
    associateErrorWithRunningSteps(error);
  }
};

const associateErrorWithRunningSteps = (error: Error) => getStepStack().forEach((step) => (step.error = error));

const stopStep = (step: StepDescriptor, status?: Status, statusDetails?: StatusDetails) => {
  reportStepStop(step, status, statusDetails);

  if (isApiStep(step) && step.error) {
    setupStepFinalization(step);
  }
};
