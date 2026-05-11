import { noopRuntime, noopSyncRuntime } from "./NoopTestRuntime.js";
import type { SyncTestRuntime, TestRuntime } from "./types.js";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";
const pwAutoconfigModuleName = "allure-playwright/autoconfig";

type NodeCreateRequire = (filename: string | URL) => NodeRequire;

type NodeProcessWithBuiltins = {
  cwd?: () => string;
  getBuiltinModule?: (id: string) => { createRequire?: NodeCreateRequire } | undefined;
};

const getNodeCreateRequire = (): NodeCreateRequire | undefined => {
  const process = (globalThis as { process?: NodeProcessWithBuiltins }).process;

  return (
    process?.getBuiltinModule?.("node:module")?.createRequire ?? process?.getBuiltinModule?.("module")?.createRequire
  );
};

const getNodeRequire = (): NodeRequire | undefined => {
  const process = (globalThis as { process?: NodeProcessWithBuiltins }).process;
  const cwd = process?.cwd?.();
  const createRequire = getNodeCreateRequire();

  return cwd && createRequire ? createRequire(`${cwd}/package.json`) : undefined;
};

const localRequire = typeof require === "function" ? require : getNodeRequire();

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
