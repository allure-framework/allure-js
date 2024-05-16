import { Config } from "allure-js-commons/sdk/node";

export interface AllureJasmineConfig extends Config {
  testMode?: boolean;
}

export type JasmineBeforeAfterFn = (action: (done: DoneFn) => void, timeout?: number) => void;
