import type { Config } from "allure-js-commons/sdk/reporter";

export interface AllureJasmineConfig extends Config {
  testMode?: boolean;
}

export type JasmineBeforeAfterFn = (action: (done: DoneFn) => void, timeout?: number) => void;
