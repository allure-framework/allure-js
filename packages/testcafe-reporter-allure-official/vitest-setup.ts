import "allure-vitest/setup";
import { afterEach, beforeEach } from "vitest";

const ALLURE_TEST_RUNTIME_KEY = "allureTestRuntime";

let previousRuntime: unknown;

beforeEach(() => {
  previousRuntime = (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY];
});

afterEach(() => {
  if (previousRuntime === undefined) {
    delete (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY];
    return;
  }

  (globalThis as Record<string, unknown>)[ALLURE_TEST_RUNTIME_KEY] = previousRuntime;
});
