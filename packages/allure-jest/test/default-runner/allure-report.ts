import { JasmineAllureReporter } from "allure-jasmine";
import { Status, TestResult } from "allure-js-commons";

const reporter = new JasmineAllureReporter({
  resultsDir: "./out/allure-results",
  testMapper: (result: TestResult): TestResult | null => {
    if (result.status === Status.SKIPPED) {
      result.fullName = `(WAS SKIPPED) ${result.fullName || "unknown"}`;
    }
    return result;
  },
});
// eslint-disable-next-line no-undef
jasmine.getEnv().addReporter(reporter);
