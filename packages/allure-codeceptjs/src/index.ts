import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllureCodeceptJSConfig } from "./model.js";
import { AllureCodeceptJSReporter } from "./reporter.js";
import { AllureCodeceptJSTestRuntime } from "./runtime.js";

const allurePlugin = (config: AllureCodeceptJSConfig) => {
  const reporter = new AllureCodeceptJSReporter(config);
  const testRuntime = new AllureCodeceptJSTestRuntime(reporter);

  setGlobalTestRuntime(testRuntime);

  return testRuntime;
};

export default allurePlugin;
