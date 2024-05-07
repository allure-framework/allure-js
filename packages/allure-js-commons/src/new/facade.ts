import { getGlobalTestRuntime } from "./TestRuntime.js";
import { ContentType, Label, LabelName, Link, LinkType, ParameterMode, ParameterOptions } from "./model.js";

export const label = (name: LabelName, value: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.labels({name, value});
};

export const labels = (...lablesList: Label[]) => {
  const runtime = getGlobalTestRuntime();

  return runtime.labels(...lablesList);
};

export const link = (url: string, type?: LinkType | string, name?: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.links({url, type, name});
};

export const links = (...linksList: Link[]) => {
  const runtime = getGlobalTestRuntime();

  return runtime.links(...linksList);
};

export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  const runtime = getGlobalTestRuntime();

  return runtime.parameter(name, value, options);
};

export const description = (markdown: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.description(markdown);
};

export const descriptionHtml = (html: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.descriptionHtml(html);
};

export const displayName = (name: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.displayName(name);
};

export const historyId = (value: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.historyId(value);
};

export const testCaseId = (value: string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.testCaseId(value);
};

export const attachment = (name: string, content: Buffer | string, type: ContentType | string) => {
  const runtime = getGlobalTestRuntime();

  return runtime.attachment(name, content, type);
};

export type StepContext = {
  displayName: (name: string) => void | PromiseLike<void>;
  parameter: (name: string, value: string, mode?: ParameterMode) => void | PromiseLike<void>;
};

const stepContext: StepContext = {
  displayName: (name) => {
    const runtime = getGlobalTestRuntime();

    return runtime.stepDisplayName(name);
  },
  parameter: (name, value, mode?) => {
    const runtime = getGlobalTestRuntime();

    return runtime.stepParameter(name, value, mode);
  },
};

export const step = (name: string, body: (context: StepContext) => void | PromiseLike<void>) => {
  const runtime = getGlobalTestRuntime();

  return runtime.step(name, () => body(stepContext));
};

export const issue = (url: string, name: string) => link(url, LinkType.ISSUE, name);

export const tms = (url: string, name: string) => link(url, LinkType.TMS, name);

export const allureId = (value: string) => label(LabelName.ALLURE_ID, value);

export const epic = (name: string) => label(LabelName.EPIC, name);

export const feature = (name: string) => label(LabelName.FEATURE, name);

export const story = (name: string) => label(LabelName.STORY, name);

export const suite = (name: string) => label(LabelName.SUITE, name);

export const parentSuite = (name: string) => label(LabelName.PARENT_SUITE, name);

export const subSuite = (name: string) => label(LabelName.SUB_SUITE, name);

export const owner = (name: string) => label(LabelName.OWNER, name);

export const severity = (name: string) => label(LabelName.SEVERITY, name);

export const layer = (name: string) => label(LabelName.LAYER, name);

export const tag = (name: string) => label(LabelName.TAG, name);

export const tags = (...tagsList: string[]) => {
  const runtime = getGlobalTestRuntime();

  return runtime.labels(...tagsList.map((value) => ({ name: LabelName.TAG, value })));
};
