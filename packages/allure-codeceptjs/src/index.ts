import { container } from "codeceptjs";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import { allureCodeceptJsLegacyApi } from "./legacy.js";
import { AllureCodeceptJsReporter } from "./reporter.js";

const allurePlugin = (config: ReporterConfig) => {
  const mocha = container.mocha();
  mocha.reporter(AllureCodeceptJsReporter.prototype.constructor, { ...config });

  return allureCodeceptJsLegacyApi;
};

export default allurePlugin;
