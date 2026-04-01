import type { TestStatus } from "@playwright/test";
import type { TestStep } from "@playwright/test/reporter";
import { Stage, Status, type StatusDetails, type StepResult } from "allure-js-commons";
import { getMessageAndTraceFromError } from "allure-js-commons/sdk";
import { getWorstTestStepResult } from "allure-js-commons/sdk/reporter";

import { ALLURE_STEP_STATUS_ANNOTATION, isAllureStepStatus } from "./syncAnnotations.js";

export const AFTER_HOOKS_ROOT_STEP_TITLE = "After Hooks";

export const BEFORE_HOOKS_ROOT_STEP_TITLE = "Before Hooks";

export const statusToAllureStats = (status: TestStatus, expectedStatus: TestStatus): Status => {
  if (status === "skipped") {
    return Status.SKIPPED;
  }

  if (status === "timedOut") {
    return Status.BROKEN;
  }

  if (status === expectedStatus) {
    return Status.PASSED;
  }

  return Status.FAILED;
};

export const isDescendantOfStepWithTitle = (step: TestStep, title: string): boolean => {
  let parent = step.parent;

  while (parent) {
    if (parent.title === title) {
      return true;
    }

    parent = parent.parent;
  }

  return false;
};

export const isAfterHookStep = (step: TestStep) => isDescendantOfStepWithTitle(step, AFTER_HOOKS_ROOT_STEP_TITLE);

export const isBeforeHookStep = (step: TestStep) => isDescendantOfStepWithTitle(step, BEFORE_HOOKS_ROOT_STEP_TITLE);

export const diffEndRegexp = /-((expected)|(diff)|(actual))\.png$/;

export const normalizeHookTitle = (title: string) => {
  return title.replace(/^[aA]ttach\s"(.+)"$/, "$1");
};

export const normalizeAttachStepTitle = (title: string): string => {
  const match = title.match(/["'`]{1}(.+?)["'`]{1}/);
  if (match?.[1]) {
    return match[1];
  }
  return title.replace(/^(test\.)?attach\s*/i, "").trim();
};

export const getSkipAnnotation = (step: Pick<TestStep, "annotations">) => {
  return step.annotations.find((annotation) => annotation.type === "skip");
};

export const getStepStatusData = (
  step: Pick<TestStep, "annotations" | "error">,
  nestedStatus?: Status,
): { status: Status; statusDetails?: StatusDetails } => {
  const annotatedStatus = step.annotations.find(
    (annotation) =>
      annotation.type === ALLURE_STEP_STATUS_ANNOTATION && isAllureStepStatus(annotation.description),
  )?.description;

  if (isAllureStepStatus(annotatedStatus)) {
    return {
      status: annotatedStatus,
      statusDetails: step.error ? { ...getMessageAndTraceFromError(step.error) } : undefined,
    };
  }

  if (step.error) {
    return {
      status: Status.FAILED,
      statusDetails: { ...getMessageAndTraceFromError(step.error) },
    };
  }

  const skipAnnotation = getSkipAnnotation(step);

  if (skipAnnotation) {
    return {
      status: Status.SKIPPED,
      statusDetails: skipAnnotation.description ? { message: skipAnnotation.description } : undefined,
    };
  }

  return {
    status: nestedStatus ?? Status.PASSED,
  };
};

export const finalizeStepResult = (stepResult: StepResult, step: Pick<TestStep, "annotations" | "error">) => {
  const { status = Status.PASSED } = getWorstTestStepResult(stepResult.steps) ?? {};
  const { status: nextStatus, statusDetails } = getStepStatusData(step, status);

  stepResult.status = nextStatus;
  stepResult.stage = Stage.FINISHED;

  if (statusDetails) {
    // Preserve any previously collected fields and only overwrite values provided by the current step outcome.
    stepResult.statusDetails = { ...stepResult.statusDetails, ...statusDetails };
  }
};
