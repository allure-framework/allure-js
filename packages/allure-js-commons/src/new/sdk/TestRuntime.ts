import { RuntimeMessage } from "./model.js";

export interface TestRuntime<T = unknown> {
  sendMessage: (message: RuntimeMessage) => void | Promise<void>;
}

// TODO: maybe we don't need these types because we gonna store TestRuntime in globalThis all the time
export type TestRuntimeGlobalGetter = () => TestRuntime | undefined;

export type TestRuntimeGlobalSetter = (runtime: TestRuntime | undefined) => void;
