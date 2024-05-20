import * as Buffer from "node:buffer";
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

class NoopRuntime implements TestRuntime {
  async attachment() {
    await this.warning();
  }

  async description() {
    await this.warning();
  }

  async descriptionHtml() {
    await this.warning();
  }

  async displayName() {
    await this.warning();
  }

  async historyId() {
    await this.warning();
  }

  async labels() {
    await this.warning();
  }

  async links() {
    await this.warning();
  }

  async parameter() {
    await this.warning();
  }

  async step() {
    await this.warning();
  }

  async stepDisplayName() {
    await this.warning();
  }

  async stepParameter() {
    await this.warning();
  }

  async testCaseId() {
    await this.warning();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async warning() {
    // eslint-disable-next-line no-console
    console.log("no test runtime is found. Please check test framework configuration");
  }
}

const noopRuntime = new NoopRuntime();

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = () => runtime;
};

const getGlobalTestRuntimeFunction = () => {
  return (globalThis as any)?.[ALLURE_TEST_RUNTIME_KEY] as (() => TestRuntime | undefined) | undefined;
};

export const getGlobalTestRuntime = (): TestRuntime => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }

  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/dot-notation
  if ((globalThis as any)?.["_playwrightInstance"]) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("allure-playwright/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
    // eslint-disable-next-line no-underscore-dangle
  } else if ((globalThis as any)?.__vitest_environment__) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("allure-vitest/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log(err);
    }
  }

  return noopRuntime;
};
