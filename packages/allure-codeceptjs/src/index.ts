import { container } from "codeceptjs";
import { attachment } from "allure-js-commons";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import { allureCodeceptJsLegacyApi } from "./legacy.js";
import { AllureCodeceptJsReporter } from "./reporter.js";

const allurePlugin = (config: ReporterConfig) => {
  const mocha = container.mocha();
  mocha.reporter(AllureCodeceptJsReporter.prototype.constructor, { ...config });

  return {
    ...allureCodeceptJsLegacyApi,
    // this method is used by various bundled codeceptjs plugins, e.g. by screenshotOnFail
    addAttachment: (name: string, content: Buffer | string, contentType: string) => {
      // wrap it in attachmentStep. Since we use Mocha, Runtime API is sync, so no awaits is fine
      attachment(name, content, contentType);
    },
  };
};

export default allurePlugin;
