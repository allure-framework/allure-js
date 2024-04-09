import {
  LabelName,
  LinkType,
  ParameterOptions,
  getGlobalTestRuntime,
} from "allure-js-commons/new/sdk/browser";

export const label = (name: string, value: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.label(name, value);
};
export const link = (url: string, type?: string, name?: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.link(url, type, name);
};
export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.parameter(name, value, options);
};
export const description = (markdown: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.description(markdown);
};
export const descriptionHtml = (html: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.descriptionHtml(html);
};
export const testCaseId = (value: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.testCaseId(value);
};
export const historyId = (value: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.historyId(value);
};
export const displayName = (name: string) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.displayName(name);
};
export const allureId = (value: string) => {
  label(LabelName.ALLURE_ID, value);
};
export const issue = (url: string, name?: string) => {
  link(url, LinkType.ISSUE, name);
};
export const tms = (url: string, name?: string) => {
  link(url, LinkType.TMS, name);
};
export const epic = (name: string) => {
  label(LabelName.EPIC, name);
};
export const feature = (name: string) => {
  label(LabelName.FEATURE, name);
};
export const story = (name: string) => {
  label(LabelName.STORY, name);
};
export const suite = (name: string) => {
  label(LabelName.SUITE, name);
};
export const parentSuite = (name: string) => {
  label(LabelName.PARENT_SUITE, name);
};
export const subSuite = (name: string) => {
  label(LabelName.SUB_SUITE, name);
};
export const owner = (name: string) => {
  label(LabelName.OWNER, name);
};
export const severity = (name: string) => {
  label(LabelName.SEVERITY, name);
};
export const layer = (name: string) => {
  label(LabelName.LAYER, name);
};
export const tag = (name: string) => {
  label(LabelName.TAG, name);
};
export const attachment = (
  name: string,
  content: unknown,
  type: string = "text/plain",
) => {
  // @ts-ignore
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.attachment(name, content, type);
};
export const step = (name: string, body: () => void) => {
  const testRuntime = getGlobalTestRuntime();

  if (!testRuntime) {
    throw new Error("Allure test runtime is not initialized");
  }

  testRuntime.step(name, body);
};
