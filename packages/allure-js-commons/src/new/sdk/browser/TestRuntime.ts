import { TestRuntime, TestRuntimeGlobalGetter } from "../TestRuntime.js";

declare global {
  interface Window {
    allureTestRuntime: TestRuntimeGlobalGetter;
  }
}

export const setGlobalTestRuntime = (runtime: TestRuntime | undefined) => {
  (globalThis as any).allureTestRuntime = () => runtime;
};

export const getGlobalTestRuntime = () => {
  return (globalThis as any).allureTestRuntime();
};
