import type { ReporterRuntime } from "allure-js-commons/sdk/reporter";

const ALLURE_TEST_RUNTIME_KEY = "__allure_mocha_legacy_runtime__";

export const getLegacyApiRuntime = () => (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] as ReporterRuntime;

export const setLegacyApiRuntime = (runtime: ReporterRuntime) =>
  ((globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = runtime);
