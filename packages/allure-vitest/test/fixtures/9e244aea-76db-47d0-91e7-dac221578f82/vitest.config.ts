
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
              resultsDir: "/Users/epszaw/Code/Work/qameta/allure-js/packages/allure-vitest/test/fixtures/9e244aea-76db-47d0-91e7-dac221578f82/allure-results",
            }),
          ],
        },
      });
    