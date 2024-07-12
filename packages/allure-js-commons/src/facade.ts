import type { Status } from "./model.js";
import { type ContentType } from "./model.js";
import { type AttachmentOptions, type Label, type Link, type ParameterMode, type ParameterOptions } from "./model.js";
import { LabelName, LinkType } from "./model.js";
import { getGlobalTestRuntimeWithAutoconfig } from "./sdk/runtime/runtime.js";
import type { TestRuntime } from "./sdk/runtime/types.js";
import { isPromise } from "./sdk/utils.js";

const callRuntimeMethod = <
  T extends keyof TestRuntime,
  S extends Parameters<TestRuntime[T]>,
  R extends ReturnType<TestRuntime[T]>,
>(
  method: T,
  ...args: S
): R => {
  const runtime = getGlobalTestRuntimeWithAutoconfig();

  if (!isPromise(runtime)) {
    // @ts-ignore
    return runtime[method](...args);
  }

  return runtime.then((testRuntime) => {
    // @ts-ignore
    return testRuntime[method](...args);
  }) as R;
};

export const label = (name: LabelName | string, value: string) => {
  return callRuntimeMethod("labels", { name, value });
};

export const labels = (...labelsList: Label[]) => {
  return callRuntimeMethod("labels", ...labelsList);
};

export const link = (url: string, name?: string, type?: LinkType | string) => {
  return callRuntimeMethod("links", { url, type, name });
};

export const links = (...linksList: Link[]) => {
  return callRuntimeMethod("links", ...linksList);
};

export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  return callRuntimeMethod("parameter", name, value, options);
};

export const description = (markdown: string) => {
  return callRuntimeMethod("description", markdown);
};

export const descriptionHtml = (html: string) => {
  return callRuntimeMethod("descriptionHtml", html);
};

export const displayName = (name: string) => {
  return callRuntimeMethod("displayName", name);
};

export const historyId = (value: string) => {
  return callRuntimeMethod("historyId", value);
};

export const testCaseId = (value: string) => {
  return callRuntimeMethod("testCaseId", value);
};

export const attachment = (
  name: string,
  content: Buffer | string,
  options: ContentType | string | AttachmentOptions,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("attachment", name, content, opts);
};

export const attachmentPath = (
  name: string,
  path: string,
  options: ContentType | string | Omit<AttachmentOptions, "encoding">,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("attachmentFromPath", name, path, opts);
};

export type StepContext = {
  displayName: (name: string) => void | PromiseLike<void>;
  parameter: (name: string, value: string, mode?: ParameterMode) => void | PromiseLike<void>;
};

const stepContext: () => StepContext = () => ({
  displayName: (name: string) => {
    return callRuntimeMethod("stepDisplayName", name);
  },
  parameter: (name, value, mode?) => {
    return callRuntimeMethod("stepParameter", name, value, mode);
  },
});

export const logStep = (name: string, status?: Status, error?: Error): PromiseLike<void> => {
  return callRuntimeMethod("logStep", name, status, error);
};

export const step = <T = void>(name: string, body: (context: StepContext) => T | PromiseLike<T>): PromiseLike<T> => {
  return callRuntimeMethod("step", name, () => body(stepContext()));
};

export const issue = (url: string, name?: string) => link(url, name, LinkType.ISSUE);

export const tms = (url: string, name?: string) => link(url, name, LinkType.TMS);

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
  return callRuntimeMethod("labels", ...tagsList.map((value) => ({ name: LabelName.TAG, value })));
};
