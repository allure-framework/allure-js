import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export interface AllurePlaywrightReporterConfig extends ReporterConfig {
  detail?: boolean;
  suiteTitle?: boolean;
}
