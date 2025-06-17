import type { TestRuntime } from "./types.js";
export declare const setGlobalTestRuntime: (runtime: TestRuntime) => void;
export declare const getGlobalTestRuntime: () => TestRuntime;
export declare const getGlobalTestRuntimeWithAutoconfig: () => TestRuntime | Promise<TestRuntime>;
