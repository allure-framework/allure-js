import type { LabelName, LinkType } from "allure-js-commons";
import type { Config } from "allure-js-commons/sdk/reporter";

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
