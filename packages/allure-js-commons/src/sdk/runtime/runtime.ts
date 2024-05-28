import { noopRuntime } from "./NoopTestRuntime.js";
import type { TestRuntime } from "./types.js";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = () => runtime;
};

const getGlobalTestRuntimeFunction = () => {
  return (globalThis as any)?.[ALLURE_TEST_RUNTIME_KEY] as (() => TestRuntime | undefined) | undefined;
};

export const getGlobalTestRuntime = async (): Promise<TestRuntime> => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }

  if ("_playwrightInstance" in globalThis) {
    try {
      // @ts-ignore
      await import("allure-playwright/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("can't execute allure-playwright/autoconfig", err);
      return noopRuntime;
    }
  }

  return noopRuntime;
};
