import AllureReporter from "allure-vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 10000,
    reporters: [
      "default",
      new AllureReporter({
        resultsDir: "./allure-results",
      }),
    ],
  },
});
