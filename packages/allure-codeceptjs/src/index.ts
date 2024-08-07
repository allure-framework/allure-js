import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { allureCodeceptJsLegacyApi } from "./legacy.js";
import { AllureCodeceptJsReporter } from "./reporter.js";
import { AllureCodeceptJsTestRuntime } from "./runtime.js";

const allurePlugin = (config: ReporterConfig) => {
  const reporter = new AllureCodeceptJsReporter(config);
  const testRuntime = new AllureCodeceptJsTestRuntime(reporter);

  // @ts-ignore
  setGlobalTestRuntime(testRuntime);

  return allureCodeceptJsLegacyApi;
};

export default allurePlugin;
