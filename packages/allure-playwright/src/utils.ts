import type { TestStatus } from "@playwright/test";
import type { TestError } from "@playwright/test/reporter";
import stripAnsi from "strip-ansi";
import type { LabelName, StatusDetails, TestResult } from "allure-js-commons";
import { Status } from "allure-js-commons";

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

export const getStatusDetails = (error: TestError): StatusDetails => {
  const message = error.message && stripAnsi(error.message);

  let trace = error.stack && stripAnsi(error.stack);

  if (trace && message && trace.startsWith(`Error: ${message}`)) {
    trace = trace.substr(message.length + "Error: ".length);
  }

  return {
    message,
    trace,
  };
};

// TODO: move to commons
export const hasLabel = (testResult: TestResult, labelName: LabelName | string): boolean => {
  return !!testResult.labels.find((l) => l.name === labelName);
};
