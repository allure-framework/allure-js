import { TestRuntime, getGlobalTestRuntime } from "./TestRuntime.js";
import { ContentType, Label, LabelName, Link, LinkType, ParameterMode, ParameterOptions } from "./model.js";

export const label = async (name: LabelName | string, value: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.labels({ name, value });
};

export const labels = async (...labelsList: Label[]) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.labels(...labelsList);
};

export const link = async (url: string, type?: LinkType | string, name?: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.links({ url, type, name });
};

export const links = async (...linksList: Link[]) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.links(...linksList);
};

export const parameter = async (name: string, value: string, options?: ParameterOptions) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.parameter(name, value, options);
};

export const description = async (markdown: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.description(markdown);
};

export const descriptionHtml = async (html: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.descriptionHtml(html);
};

export const displayName = async (name: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.displayName(name);
};

export const historyId = async (value: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.historyId(value);
};

export const testCaseId = async (value: string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.testCaseId(value);
};

export const attachment = async (name: string, content: Buffer | string, type: ContentType | string) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.attachment(name, content, type);
};

export type StepContext = {
  displayName: (name: string) => void | PromiseLike<void>;
  parameter: (name: string, value: string, mode?: ParameterMode) => void | PromiseLike<void>;
};

const stepContext: (runtime: TestRuntime) => StepContext = (runtime) => ({
  displayName: (name) => {
    return runtime.stepDisplayName(name);
  },
  parameter: (name, value, mode?) => {
    return runtime.stepParameter(name, value, mode);
  },
});

export const step = async <T = void,>(name: string, body: (context: StepContext) => T | PromiseLike<T>) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.step(name, () => body(stepContext(runtime)));
};

export const issue = async (url: string, name?: string) => link(url, LinkType.ISSUE, name);

export const tms = async (url: string, name?: string) => link(url, LinkType.TMS, name);

export const allureId = async (value: string) => label(LabelName.ALLURE_ID, value);

export const epic = async (name: string) => label(LabelName.EPIC, name);

export const feature = async (name: string) => label(LabelName.FEATURE, name);

export const story = async (name: string) => label(LabelName.STORY, name);

export const suite = async (name: string) => label(LabelName.SUITE, name);

export const parentSuite = async (name: string) => label(LabelName.PARENT_SUITE, name);

export const subSuite = async (name: string) => label(LabelName.SUB_SUITE, name);

export const owner = async (name: string) => label(LabelName.OWNER, name);

export const severity = async (name: string) => label(LabelName.SEVERITY, name);

export const layer = async (name: string) => label(LabelName.LAYER, name);

export const tag = async (name: string) => label(LabelName.TAG, name);

export const tags = async (...tagsList: string[]) => {
  const runtime = await getGlobalTestRuntime();

  return runtime.labels(...tagsList.map((value) => ({ name: LabelName.TAG, value })));
};
