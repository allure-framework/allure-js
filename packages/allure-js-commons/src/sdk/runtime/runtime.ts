import { noopRuntime } from "./NoopTestRuntime.js";
import type { TestRuntime } from "./types.js";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

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

  return noopRuntime;
};

export const getGlobalTestRuntimeWithAutoconfig = (): TestRuntime | Promise<TestRuntime> => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }

  if ("_playwrightInstance" in globalThis) {
    try {
      // protection from bundlers tree-shaking visiting (webpack, rollup)
      // @ts-ignore
      // eslint-disable-next-line no-eval
      return (0, eval)("(() => import('allure-playwright/autoconfig'))()").then(() => {
        return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("can't execute allure-playwright/autoconfig", err);
      return noopRuntime;
    }
  }

  return noopRuntime;
};
