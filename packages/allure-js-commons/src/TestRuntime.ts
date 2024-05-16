import { ContentType, Label, Link, ParameterMode, ParameterOptions } from "./model.js";

export const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

export interface TestRuntime {
  labels: (...labels: Label[]) => PromiseLike<void>;

  links: (...links: Link[]) => PromiseLike<void>;

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

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = () => runtime;
};

export const getGlobalTestRuntime = (): TestRuntime => {
  const testRuntime = (globalThis as any)?.[ALLURE_TEST_RUNTIME_KEY] as () => TestRuntime | undefined;

  if (testRuntime) {
    return testRuntime()!;
  }

  // @ts-ignore
  if (globalThis._playwrightInstance) {
    try {
      const modulePath = require.resolve("allure-playwright/autoconfig");

      debugger
    } catch (err) {
      debugger
    }
  }

  return (globalThis as any)[ALLURE_TEST_RUNTIME_KEY]() as TestRuntime;
};
