import {Allure, JasmineAllureReporter} from "allure-jasmine";
import { AllureRuntime, Status, TestResult } from "allure-js-commons";

const reporter = new JasmineAllureReporter(
  new AllureRuntime({
    resultsDir: "./out/allure-results",
    testMapper: (result: TestResult) => {
      if (result.status == Status.SKIPPED) result.fullName = `(WAS SKIPPED) ${result.fullName}`;
      return result;
    }
  })
);

const allure: Allure = reporter.getInterface();

jasmine.getEnv().addReporter(reporter);

export default allure;
