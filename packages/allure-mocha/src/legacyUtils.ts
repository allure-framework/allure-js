import type { AllureMochaReporter } from "./AllureMochaReporter.js";

const ALLURE_TEST_RUNTIME_KEY = "__allure_mocha_legacy_runtime__";

export const getLegacyApiRuntime = () => (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] as AllureMochaReporter;

export const setLegacyApiRuntime = (runtime: AllureMochaReporter) =>
  ((globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = runtime);
