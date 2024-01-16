
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
              resultsDir: "/Users/epszaw/Code/Work/qameta/allure-js/packages/allure-vitest/test/fixtures/658d3cd0-afae-4b64-bfa2-1f994a512c4c/allure-results",
            }),
          ],
        },
      });
    