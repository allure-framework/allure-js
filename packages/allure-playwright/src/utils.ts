import type { TestStatus } from "@playwright/test";
import type { TestStep } from "@playwright/test/reporter";
import { Status } from "allure-js-commons";

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
