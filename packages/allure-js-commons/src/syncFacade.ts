import type {
  AttachmentOptions,
  Label,
  Link,
  ParameterMode,
  ParameterOptions,
  Status,
  StatusDetails,
} from "./model.js";
import { type ContentType, LabelName, LinkType } from "./model.js";
import { getGlobalSyncTestRuntimeWithAutoconfig } from "./sdk/runtime/runtime.js";
import type { SyncStepContext, SyncTestRuntime } from "./sdk/runtime/types.js";

const callRuntimeMethod = <
  T extends keyof SyncTestRuntime,
  S extends Parameters<SyncTestRuntime[T]>,
  R extends ReturnType<SyncTestRuntime[T]>,
>(
  method: T,
  ...args: S
): R => {
  const runtime = getGlobalSyncTestRuntimeWithAutoconfig();

  // @ts-ignore
  return runtime[method](...args);
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
  content: Buffer | Uint8Array | string,
  options: ContentType | string | AttachmentOptions,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("attachment", name, content, opts);
};

export const globalAttachment = (
  name: string,
  content: Buffer | Uint8Array | string,
  options: ContentType | string | AttachmentOptions,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("globalAttachment", name, content, opts);
};

export const globalAttachmentPath = (
  name: string,
  path: string,
  options: ContentType | string | Omit<AttachmentOptions, "encoding">,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("globalAttachmentFromPath", name, path, opts);
};

export const globalError = (details: StatusDetails) => {
  return callRuntimeMethod("globalError", details);
};

export const attachTrace = (name: string, path: string) => {
  return callRuntimeMethod("attachmentFromPath", name, path, {
    contentType: "application/vnd.allure.playwright-trace",
  });
};

export const attachmentPath = (
  name: string,
  path: string,
  options: ContentType | string | Omit<AttachmentOptions, "encoding">,
) => {
  const opts = typeof options === "string" ? { contentType: options } : options;
  return callRuntimeMethod("attachmentFromPath", name, path, opts);
};

const stepContext = (): SyncStepContext => ({
  displayName: (name: string) => {
    return callRuntimeMethod("stepDisplayName", name);
  },
  parameter: (name, value, mode?: ParameterMode) => {
    return callRuntimeMethod("stepParameter", name, value, mode);
  },
});

export const logStep = (name: string, status?: Status, error?: Error): void => {
  return callRuntimeMethod("logStep", name, status, error);
};

export const step = <T = void>(name: string, body: (context: SyncStepContext) => T): T => {
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
  return callRuntimeMethod(
    "labels",
    ...tagsList.map((value) => ({
      name: LabelName.TAG,
      value,
    })),
  );
};
