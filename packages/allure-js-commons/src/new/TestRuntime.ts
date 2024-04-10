import { ContentType, LabelName, LinkType, ParameterMode, ParameterOptions, RuntimeMessage } from "./model.js";

export interface TestRuntime<T = unknown> {
  label: (name: LabelName, value: string) => void | Promise<void>;

  link: (url: string, type?: LinkType | string, name?: string) => void | Promise<void>;

  parameter: (name: string, value: string, options?: ParameterOptions) => void | Promise<void>;

  description: (markdown: string) => void | Promise<void>;

  descriptionHtml: (html: string) => void | Promise<void>;

  displayName: (name: string) => void | Promise<void>;

  historyId: (value: string) => void | Promise<void>;

  testCaseId: (value: string) => void | Promise<void>;

  attachment: (name: string, content: Buffer | string, type: ContentType | string) => void | Promise<void>;

  step: (name: string, body: () => void | Promise<void>) => void | Promise<void>;

  stepDisplayName: (name: string) => void | Promise<void>;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => void | Promise<void>;

  sendMessage: (message: RuntimeMessage) => void | Promise<void>;
}

// TODO: maybe we don't need these types because we gonna store TestRuntime in globalThis all the time
// export type TestRuntimeGlobalGetter = () => TestRuntime | undefined;
//
// export type TestRuntimeGlobalSetter = (runtime: TestRuntime | undefined) => void;

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any).allureTestRuntime = () => runtime;
};

export const getGlobalTestRuntime = () => {
  return (globalThis as any).allureTestRuntime();
};
