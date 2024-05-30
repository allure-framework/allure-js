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
