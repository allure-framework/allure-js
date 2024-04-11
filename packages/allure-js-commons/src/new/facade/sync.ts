import { SyncTestRuntime, getGlobalTestRuntime } from "../TestRuntime.js";
import { ContentType, LabelName, LinkType, ParameterMode, ParameterOptions } from "../model.js";

export const label = (name: LabelName, value: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(name, value);
};

export const link = (url: string, type?: LinkType | string, name?: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.link(url, type, name);
};

export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.parameter(name, value, options);
};

export const description = (markdown: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.description(markdown);
};

export const descriptionHtml = (html: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.descriptionHtml(html);
};

export const displayName = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.displayName(name);
};

export const historyId = (value: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.historyId(value);
};

export const testCaseId = (value: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.testCaseId(value);
};

export const attachment = (name: string, content: Buffer | string, type: ContentType | string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.attachment(name, content, type);
};

export type StepContext = {
  displayName: (name: string) => void | Promise<void>;
  parameter: (name: string, value: string, mode?: ParameterMode) => void | Promise<void>;
};

const stepContext: StepContext = {
  displayName: (name) => {
    const runtime = getGlobalTestRuntime<SyncTestRuntime>();

    return runtime.stepDisplayName(name);
  },
  parameter: (name, value, mode?) => {
    const runtime = getGlobalTestRuntime<SyncTestRuntime>();

    return runtime.stepParameter(name, value, mode);
  },
};

export const step = (name: string, body: (context: StepContext) => void) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.step(name, () => body(stepContext));
};

export const issue = (url: string, name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.link(url, LinkType.ISSUE, name);
};

export const tms = (url: string, name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.link(url, LinkType.TMS, name);
};

export const allureId = (value: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.ALLURE_ID, value);
};

export const epic = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.EPIC, name);
};

export const feature = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.FEATURE, name);
};

export const story = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.STORY, name);
};

export const suite = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.SUITE, name);
};

export const parentSuite = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.PARENT_SUITE, name);
};

export const subSuite = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.SUB_SUITE, name);
};

export const owner = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.OWNER, name);
};

export const severity = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.SEVERITY, name);
};

export const layer = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.LAYER, name);
};

export const tag = (name: string) => {
  const runtime = getGlobalTestRuntime<SyncTestRuntime>();

  return runtime.label(LabelName.TAG, name);
};
