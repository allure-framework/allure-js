import { Config } from "allure-js-commons/new/sdk/node";

export interface AllureJasmineConfig extends Config {
  testMode?: boolean;
}
