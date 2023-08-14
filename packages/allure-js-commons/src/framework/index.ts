import { StepBodyFunction } from "../AllureCommandStep";
import { ParameterOptions } from "../model";

export interface AllureRuntimeApiInterface {
  label(name: string, value: string): void;

  parameter(name: string, value: any, options?: ParameterOptions): void;

  link(url: string, name?: string, type?: string): void;

  attachment(content: string | Buffer, type: string): void;

  step(name: string, body: StepBodyFunction): void;

  epic(epic: string): void;

  feature(feature: string): void;

  story(story: string): void;

  suite(name: string): void;

  parentSuite(name: string): void;

  subSuite(name: string): void;

  owner(owner: string): void;

  severity(severity: string): void;

  layer(layer: string): void;

  id(allureId: string): void;

  tag(tag: string): void;

  issue(name: string, url: string): void;

  tms(name: string, url: string): void;

  description(markdown: string): void;

  descriptionHtml(html: string): void;
}
