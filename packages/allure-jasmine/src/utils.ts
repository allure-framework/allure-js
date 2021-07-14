import { Status, StatusDetails } from "allure-js-commons";


export const getAllureTestStatus: (result: jasmine.SpecResult) => Status | undefined = result => {
  switch (result.status) {
    case "failed":
      return Status.FAILED;
    case "broken":
      return Status.BROKEN;
    case "passed":
      return Status.PASSED;
    case "pending":
    case "disabled":
    case "excluded":
      return Status.SKIPPED;
  }
};

export const getAllureStatusDetails: (result?: jasmine.SpecResult, startIndex?: number) =>
  StatusDetails | undefined = (result, startIndex = 0) => {
    const failedExpectations = (result?.failedExpectations || []).slice(startIndex);
    if (failedExpectations.length > 0) {
      return {
        message: failedExpectations
          .map((failedExpectation, index) => `[${index + startIndex + 1}] - ${failedExpectation.message}`)
          .join("\n\n"),
        trace: failedExpectations
          .map((failedExpectation, index) => `[${index + startIndex + 1}] - ${failedExpectation.stack}`)
          .join("\n\n")
      };
    } else if (result?.pendingReason) {
      return {
        message: result.pendingReason
      };
    }
};
