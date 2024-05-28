import type { Config } from "allure-js-commons/sdk/reporter";

export interface AllurePlaywrightReporterConfig extends Omit<Config, "writer"> {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  testMode?: boolean;
}
