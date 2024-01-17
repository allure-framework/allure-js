import AllureReporter from "allure-vitest/reporter";
import { defineConfig } from "vitest/config";

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
