import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllureCodeceptJsConfig } from "./model.js";
import { AllureCodeceptJsReporter } from "./reporter.js";
import { AllureCodeceptJsTestRuntime } from "./runtime.js";

const allurePlugin = (config: AllureCodeceptJsConfig) => {
  const reporter = new AllureCodeceptJsReporter(config);
  const testRuntime = new AllureCodeceptJsTestRuntime(reporter);

  setGlobalTestRuntime(testRuntime);

  return testRuntime;
};

export default allurePlugin;
