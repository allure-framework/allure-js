import type { LabelName, LinkType } from "allure-js-commons";
import type { Config } from "allure-js-commons/sdk/reporter";

export const ALLURE_SETUP_REPORTER_HOOK = "__allure_reporter_setup_hook__";

export type LabelConfig = {
  pattern: RegExp[];
  name: LabelName | string;
};

export type LinkConfig = {
  pattern: RegExp[];
  urlTemplate: string;
  type: LinkType | string;
};

export interface AllureCucumberReporterConfig extends Omit<Config, "writer" | "links"> {
  testMode?: boolean;
  links?: LinkConfig[];
  labels?: LabelConfig[];
}
