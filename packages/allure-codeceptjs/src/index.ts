import { container } from "codeceptjs";
import { attachment } from "allure-js-commons";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";
import { allureCodeceptJsLegacyApi } from "./legacy.js";
import { AllureCodeceptJsReporter } from "./reporter.js";

const allurePlugin = (config: ReporterConfig) => {
  const mocha = container.mocha();

  // At this point the configured reporter's constructor has been initialized and is available via the _reporter field.
  // See https://github.com/mochajs/mocha/blob/05097db4f2e0118f033978b8503aec36b1867c55/lib/mocha.js#L352
  // The field is not public but there is no other option to get the constructor; this is covered by tests in reporters.test.ts.
  // eslint-disable-next-line no-underscore-dangle
  const currentReporter = mocha._reporter;
  mocha.reporter(AllureCodeceptJsReporter.prototype.constructor, {
    ...config,
    ...(currentReporter ? { extraReporters: [currentReporter, mocha.options.reporterOptions] } : {}),
  });

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
