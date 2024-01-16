
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
              resultsDir: "/Users/epszaw/Code/Work/qameta/allure-js/packages/allure-vitest/test/fixtures/e48fcb6c-05bc-45ac-be82-b947c25883d4/allure-results",
            }),
          ],
        },
      });
    