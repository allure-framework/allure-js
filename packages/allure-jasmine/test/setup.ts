import { JasmineAllureReporter } from "../src/JasmineAllureReporter";
import { JasmineConsoleReporter } from "../src/JasmineConsoleReporter";
import { Status, TestResult } from "allure-js-commons";

jasmine.getEnv().addReporter(new JasmineConsoleReporter());

const reporter = new JasmineAllureReporter({
  resultsDir: "./out/allure-results",
  testMapper: (result: TestResult) => {
    if (result.status == Status.SKIPPED) result.fullName = `(WAS SKIPPED) ${result.fullName}`;
    return result;
  }
});
jasmine.getEnv().addReporter(reporter);

export const allure = reporter.getInterface();

allure.writeEnvironmentInfo({
  a: "b",
  PATH: "azazaz",
  APPDATA: "C:\\USERS\\test (x86)\\AppData",
  PS1: "\\[\\0330;$MSYSTEM;${PWD//[^[:ascii:]]/?}\\007\\]",
  TEST1: "\\usr\\bin"
});

allure.writeCategoriesDefinitions([
  {
    "name": "Sad tests",
    "messageRegex": /.*Sad.*/,
    "matchedStatuses": [
      Status.FAILED
    ]
  },
  {
    "name": "Infrastructure problems",
    "messageRegex": ".*RuntimeException.*",
    "matchedStatuses": [
      Status.BROKEN
    ]
  },
  {
    "name": "Outdated tests",
    "messageRegex": ".*FileNotFound.*",
    "matchedStatuses": [
      Status.BROKEN
    ]
  },
  {
    "name": "Regression",
    "messageRegex": ".*\\sException:.*",
    "matchedStatuses": [
      Status.BROKEN
    ]
  }
]);
