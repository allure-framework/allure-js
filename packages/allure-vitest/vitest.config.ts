import { defineConfig } from "vitest/config";
import AllureReporter from "allure-vitest/reporter";

export default defineConfig({
  test: {
    testTimeout: 10000,
    setupFiles: ["allure-vitest/setup"],
    reporters: [
      "default",
      new AllureReporter({
        resultsDir: "./allure-results",
      }),
    ],
  },
});
