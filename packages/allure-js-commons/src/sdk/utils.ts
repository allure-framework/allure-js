import stripAnsi from "strip-ansi";
import type { FixtureResult, Label, StatusDetails, StepResult, TestResult } from "../model.js";
import { LabelName, Status } from "../model.js";

export const getStatusFromError = (error: Error): Status => {
  switch (true) {
    /**
     * Native `node:assert` and `chai` (`vitest` uses it under the hood) throw `AssertionError`
     * `jest` throws `JestAssertionError` instance
     * `jasmine` throws `ExpectationFailed` instance
     */
    case /assert/gi.test(error.constructor.name):
    case /expectation/gi.test(error.constructor.name):
    case /assert/gi.test(error.name):
    case /assert/gi.test(error.message):
      return Status.FAILED;
    default:
      return Status.BROKEN;
  }
};

export const getMessageAndTraceFromError = (error: Error): Pick<StatusDetails, "message" | "trace"> => {
  const { message, stack } = error;
  return {
    message: stripAnsi(message),
    trace: stack ? stripAnsi(stack) : undefined,
  };
};

export const allureIdRegexp = /@?allure.id[:=](?<id>[^\s]+)/;
export const allureIdRegexpGlobal = new RegExp(allureIdRegexp, "g");
export const allureLabelRegexp = /@?allure.label.(?<name>[^\s]+?)[:=](?<value>[^\s]+)/;
export const allureLabelRegexpGlobal = new RegExp(allureLabelRegexp, "g");

export const extractMetadataFromString = (
  title: string,
): {
  labels: Label[];
  cleanTitle: string;
} => {
  const labels = [] as Label[];

  title.split(" ").forEach((val) => {
    const idValue = val.match(allureIdRegexp)?.groups?.id;

    if (idValue) {
      labels.push({ name: LabelName.ALLURE_ID, value: idValue });
    }

    const labelMatch = val.match(allureLabelRegexp);
    const { name, value } = labelMatch?.groups || {};

    if (name && value) {
      labels?.push({ name, value });
    }
  });

  const cleanTitle = title.replace(allureLabelRegexpGlobal, "").replace(allureIdRegexpGlobal, "").trim();

  return { labels, cleanTitle };
};

export const isAnyStepFailed = (item: StepResult | TestResult | FixtureResult): boolean => {
  const isFailed = item.status === Status.FAILED;

  if (isFailed || item.steps.length === 0) {
    return isFailed;
  }

  return !!item.steps.find((step) => isAnyStepFailed(step));
};

export const isAllStepsEnded = (item: StepResult | TestResult | FixtureResult): boolean => {
  return item.steps.every((val) => val.stop && isAllStepsEnded(val));
};
