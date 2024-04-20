import { Config } from "allure-js-commons/new/sdk/node";

export interface AllurePlaywrightReporterConfig extends Omit<Config, "writer"> {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  testMode?: boolean;
  // TODO:
  // categories?: Category[];
  environmentInfo?: Record<string, string>;
}
