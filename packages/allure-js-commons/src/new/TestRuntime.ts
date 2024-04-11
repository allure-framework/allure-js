import { ContentType, LabelName, LinkType, ParameterMode, ParameterOptions, RuntimeMessage } from "./model.js";

export interface TestRuntime<T = unknown> {
  label: (name: LabelName, value: string) => T;

  link: (url: string, type?: LinkType | string, name?: string) => T;

  parameter: (name: string, value: string, options?: ParameterOptions) => T;

  description: (markdown: string) => T;

  descriptionHtml: (html: string) => T;

  displayName: (name: string) => T;

  historyId: (value: string) => T;

  testCaseId: (value: string) => T;

  attachment: (name: string, content: Buffer | string, type: ContentType | string) => T;

  step: (name: string, body: () => T) => T;

  stepDisplayName: (name: string) => T;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => T;

  sendMessage: (message: RuntimeMessage) => T;
}

export interface SyncTestRuntime extends TestRuntime<void> {};

export interface AsyncTestRuntime extends TestRuntime<Promise<void>> {};

// TODO: maybe we don't need these types because we gonna store TestRuntime in globalThis all the time
// export type TestRuntimeGlobalGetter = () => TestRuntime | undefined;
//
// export type TestRuntimeGlobalSetter = (runtime: TestRuntime | undefined) => void;

export const setGlobalTestRuntime = <T>(runtime: T) => {
  (globalThis as any).allureTestRuntime = () => runtime;
};

export const getGlobalTestRuntime = <T>() => {
  return (globalThis as any).allureTestRuntime() as T;
};
