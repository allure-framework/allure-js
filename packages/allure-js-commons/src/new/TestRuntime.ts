import { ContentType, LabelName, LinkType, ParameterMode, ParameterOptions, RuntimeMessage } from "./model.js";

export interface TestRuntime {
  label: (name: LabelName, value: string) => PromiseLike<void>;

  link: (url: string, type?: LinkType | string, name?: string) => PromiseLike<void>;

  parameter: (name: string, value: string, options?: ParameterOptions) => PromiseLike<void>;

  description: (markdown: string) => PromiseLike<void>;

  descriptionHtml: (html: string) => PromiseLike<void>;

  displayName: (name: string) => PromiseLike<void>;

  historyId: (value: string) => PromiseLike<void>;

  testCaseId: (value: string) => PromiseLike<void>;

  attachment: (name: string, content: Buffer | string, type: ContentType | string) => PromiseLike<void>;

  step: (name: string, body: () => void | PromiseLike<void>) => PromiseLike<void>;

  stepDisplayName: (name: string) => PromiseLike<void>;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => PromiseLike<void>;
}

// TODO: maybe we don't need these types because we gonna store TestRuntime in globalThis all the time
// export type TestRuntimeGlobalGetter = () => TestRuntime | undefined;
//
// export type TestRuntimeGlobalSetter = (runtime: TestRuntime | undefined) => void;

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any).allureTestRuntime = () => runtime;
};

export const getGlobalTestRuntime = () => {
  return (globalThis as any).allureTestRuntime() as TestRuntime;
};
