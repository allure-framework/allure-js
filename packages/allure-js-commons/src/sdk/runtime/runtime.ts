import { createRequire } from "node:module";
import { noopRuntime } from "./NoopTestRuntime";
import type { TestRuntime } from "./types.js";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

const requireModule = async (modulePath: string) => {
  let module;
  if (typeof __dirname === "undefined") {
    const rq = createRequire(import.meta.url);
    module = rq(modulePath);
  } else {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    module = require(modulePath);
  }

  return Promise.resolve(module);
};

export const setGlobalTestRuntime = (runtime: TestRuntime) => {
  (globalThis as any)[ALLURE_TEST_RUNTIME_KEY] = () => runtime;
};

const getGlobalTestRuntimeFunction = () => {
  return (globalThis as any)?.[ALLURE_TEST_RUNTIME_KEY] as (() => TestRuntime | undefined) | undefined;
};

export const getGlobalTestRuntime = async (): Promise<TestRuntime> => {
  const testRuntime = getGlobalTestRuntimeFunction();

  if (testRuntime) {
    return testRuntime() ?? noopRuntime;
  }

  /**
   * Playwright is only available as CJS, so use require for
   * allure-js-commons loaded in both CJS and ESM.
   */
  if ("_playwrightInstance" in globalThis) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      await requireModule("allure-playwright/autoconfig");

      return getGlobalTestRuntimeFunction()?.() ?? noopRuntime;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("can't execute allure-playwright/autoconfig", err);
      return noopRuntime;
    }
  }

  return noopRuntime;
};
