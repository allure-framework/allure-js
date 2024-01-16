
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
              resultsDir: "/Users/epszaw/Code/Work/qameta/allure-js/packages/allure-vitest/test/fixtures/cc8c705d-5319-46ed-a63a-d0a2d8d7fb5f/allure-results",
            }),
          ],
        },
      });
    