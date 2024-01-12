import AllureReporter from "allure-vitest";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    reporters: [
      "default",
      new AllureReporter({
        links: [
          {
            type: "issue",
            urlTemplate: "https://example.org/issue/%s",
          },
          {
            type: "tms",
            urlTemplate: "https://example.org/task/%s",
          },
        ],
        resultsDir: "./test/fixtures/allure-results",
      }),
    ],
  },
});
