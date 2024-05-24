import { TestStatus } from "@playwright/test";
import { TestError } from "@playwright/test/reporter";
import { LabelName, Status, StatusDetails, TestResult } from "allure-js-commons/sdk/node";

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
  const message = error.message;
  let trace = error.stack;

  if (trace && message && trace.startsWith(`Error: ${message}`)) {
    trace = trace.substr(message.length + "Error: ".length);
  }

  return {
    message,
    trace,
  };
};

// TODO: move to commons
export const hasLabel = (testResult: TestResult, labelName: LabelName): boolean => {
  return !!testResult.labels.find((l) => l.name === labelName);
};
