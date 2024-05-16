import { Category, Config } from "allure-js-commons/sdk/node";

export interface AllurePlaywrightReporterConfig extends Omit<Config, "writer"> {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  testMode?: boolean;
  categories?: Category[];
  environmentInfo?: Record<string, string>;
}
