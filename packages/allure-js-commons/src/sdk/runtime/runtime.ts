import { noopRuntime, noopSyncRuntime } from "./NoopTestRuntime.js";
import type { SyncTestRuntime, TestRuntime } from "./types.js";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";
const pwAutoconfigModuleName = "allure-playwright/autoconfig";
const localRequire = typeof require === "function" ? require : undefined;

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

export const getGlobalSyncTestRuntime = (): SyncTestRuntime => {
  return getGlobalTestRuntime().sync ?? noopSyncRuntime;
};

export const getGlobalSyncTestRuntimeWithAutoconfig = (): SyncTestRuntime => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime()?.sync ?? noopSyncRuntime;
  }

  if (!localRequire) {
    return noopSyncRuntime;
  }

  try {
    localRequire(pwAutoconfigModuleName);
  } catch {
    return noopSyncRuntime;
  }

  return getGlobalTestRuntimeFunction()?.()?.sync ?? noopSyncRuntime;
};

export const getGlobalTestRuntimeWithAutoconfig = (): TestRuntime | Promise<TestRuntime> => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }
  return import(
    /* @vite-ignore */
    pwAutoconfigModuleName
  )
    .then(() => getGlobalTestRuntimeFunction()?.() ?? noopRuntime)
    .catch(() => noopRuntime);
};
