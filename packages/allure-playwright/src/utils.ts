import type { TestStatus } from "@playwright/test";
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
