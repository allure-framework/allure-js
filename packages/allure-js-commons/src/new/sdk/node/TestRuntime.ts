import { TestRuntime, TestRuntimeGlobalGetter } from "../TestRuntime.js";

declare global {
  interface Global {
    allureTestRuntime: TestRuntimeGlobalGetter;
  }
}

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any).allureTestRuntime = () => runtime;
};

export const getGlobalTestRuntime = () => {
  return (globalThis as any).allureTestRuntime();
};
