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

  // protection from bundlers tree-shaking visiting (webpack, rollup)
  const pwAutoconfigModuleName = "allure-playwright/autoconfig";

  return import(pwAutoconfigModuleName)
    .then(() => getGlobalTestRuntimeFunction()?.() ?? noopRuntime)
    .catch(() => noopRuntime);
};
