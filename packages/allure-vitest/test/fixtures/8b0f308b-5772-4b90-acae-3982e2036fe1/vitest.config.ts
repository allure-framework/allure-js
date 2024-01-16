
      import AllureReporter from "allure-vitest";
      import { defineConfig } from "vitest/config";

      export default defineConfig({
        test: {
          reporters: [
            new AllureReporter({
              testMode: true,
              links: [
                {
                  type: "issue",
                  urlTemplate: "https://example.org/issue/%s",
                },
                {
                  type: "tms",
                  urlTemplate: "https://example.org/tms/%s",
                },
              ],
              resultsDir: "/Users/epszaw/Code/Work/qameta/allure-js/packages/allure-vitest/test/fixtures/8b0f308b-5772-4b90-acae-3982e2036fe1/allure-results",
            }),
          ],
        },
      });
    