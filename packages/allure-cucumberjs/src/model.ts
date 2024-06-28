import type { LabelName } from "allure-js-commons";
import type { Config, LinkConfig, LinkTypeOptions } from "allure-js-commons/sdk/reporter";

export const ALLURE_SETUP_REPORTER_HOOK = "__allure_reporter_setup_hook__";

export type LabelConfig = {
  pattern: RegExp[];
  name: LabelName | string;
};

export type AllureCucumberLinkConfig = LinkConfig<LinkTypeOptions & { pattern: RegExp[] }>;

export interface AllureCucumberReporterConfig extends Omit<Config, "writer" | "links"> {
  links?: AllureCucumberLinkConfig;
  labels?: LabelConfig[];
}
