import type { ContentType, Label, Link, ParameterMode, ParameterOptions } from "./model.js";
import { LabelName, LinkType } from "./model.js";
import { getGlobalTestRuntimeWithAutoconfig } from "./sdk/runtime/runtime.js";
import type { TestRuntime } from "./sdk/runtime/types.js";
import { isPromise } from "./sdk/utils.js";

const callRuntimeMethod = (method: string, ...args: any[]) => {
  const runtime = getGlobalTestRuntimeWithAutoconfig();

  if (!isPromise(runtime)) {
    // @ts-ignore
    return (runtime as TestRuntime)[method](...args);
  }

  return (runtime as Promise<TestRuntime>).then((testRuntime) => {
    // @ts-ignore
    return testRuntime[method](...args);
  });
};

export const label = (name: LabelName | string, value: string) => {
  return callRuntimeMethod("labels", { name, value });
  // const runtime = getGlobalTestRuntimeWithAutoconfig();
  //
  // if (!isPromise(runtime)) {
  //   return (runtime as TestRuntime).labels({ name, value });
  // }
  //
  // return (runtime as Promise<TestRuntime>).then((testRuntime) => testRuntime.labels({ name, value }));
};

export const labels = (...labelsList: Label[]) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.labels(...labelsList);
  return callRuntimeMethod("labels", ...labelsList);
};

export const link = (url: string, type?: LinkType | string, name?: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.links({ url, type, name });
  return callRuntimeMethod("links", { url, type, name });
};

export const links = (...linksList: Link[]) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.links(...linksList);
  return callRuntimeMethod("links", ...linksList);
};

export const parameter = (name: string, value: string, options?: ParameterOptions) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.parameter(name, value, options);
  return callRuntimeMethod("parameter", name, value, options);
};

export const description = (markdown: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.description(markdown);
  return callRuntimeMethod("description", markdown);
};

export const descriptionHtml = (html: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.descriptionHtml(html);
  return callRuntimeMethod("descriptionHtml", html);
};

export const displayName = (name: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.displayName(name);
  return callRuntimeMethod("displayName", name);
};

export const historyId = (value: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.historyId(value);
  return callRuntimeMethod("historyId", value);
};

export const testCaseId = (value: string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.testCaseId(value);
  return callRuntimeMethod("testCaseId", value);
};

export const attachment = (name: string, content: Buffer | string, type: ContentType | string) => {
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.attachment(name, content, type);
  return callRuntimeMethod("attachment", name, content, type);
};

export type StepContext = {
  displayName: (name: string) => void | PromiseLike<void>;
  parameter: (name: string, value: string, mode?: ParameterMode) => void | PromiseLike<void>;
};

const stepContext: () => StepContext = () => ({
  displayName: (name: string) => {
    // return runtime.stepDisplayName(name);
    return callRuntimeMethod("stepDisplayName", name);
  },
  parameter: (name, value, mode?) => {
    // return runtime.stepParameter(name, value, mode);
    return callRuntimeMethod("stepParameter", name, value, mode);
  },
});

export const step = <T = void>(name: string, body: (context: StepContext) => T | PromiseLike<T>) => {
  // throw new Error("Not implemented");
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.step(name, () => body(stepContext(runtime)));
  return callRuntimeMethod("step", name, () => body(stepContext()));
};

export const issue = (url: string, name?: string) => link(url, LinkType.ISSUE, name);

export const tms = (url: string, name?: string) => link(url, LinkType.TMS, name);

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
  // const runtime = await getGlobalTestRuntimeWithAutoconfig();
  //
  // return runtime.labels(...tagsList.map((value) => ({ name: LabelName.TAG, value })));
  return callRuntimeMethod("labels", ...tagsList.map((value) => ({ name: LabelName.TAG, value })));
};
