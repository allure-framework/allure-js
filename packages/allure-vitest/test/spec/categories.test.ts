import { beforeAll, describe, expect, it } from "vitest";

import {
  type TestFileAccessor,
  browserSetupModulePath,
  reporterModulePath,
  runVitestInlineTest,
  setupModulePath,
} from "../utils.js";

describe("categories", () => {
  for (const env of ["node", "browser"]) {
    describe(`for "${env}"`, () => {
      let configFileAccessor: TestFileAccessor;

      beforeAll(() => {
        configFileAccessor = ({ allureResultsPath }) => {
          if (env === "node") {
            return `
          import { defineConfig } from "vitest/config";

          export default defineConfig({
            test: {
              setupFiles: ["${setupModulePath}"],
              reporters: [
                "default",
                [
                  "${reporterModulePath}",
                  {
                    resultsDir: "${allureResultsPath}",
                    categories: [{
                      name: "first"
                    },{
                      name: "second"
                    }]
                  }
                ],
              ],
            },
          });
        `;
          }
          return `
          import { defineConfig } from "vitest/config";
          import { commands } from "allure-vitest/browser";
          import { playwright } from "@vitest/browser-playwright";

          export default defineConfig({
            test: {
              openTelemetry: { enabled: false },
              setupFiles: ["${browserSetupModulePath}"],
              reporters: [
                "default",
                [
                  "${reporterModulePath}",
                  {
                    resultsDir: "${allureResultsPath}",
                    categories: [{
                      name: "first"
                    },{
                      name: "second"
                    }]
                  }
                ],
              ],
              browser: {
                provider: playwright(),
                enabled: true,
                headless: true,
                instances: [{ browser: "chromium" }],
                commands: { ...commands },
              },
            },
          });
        `;
        };
      });

      it("should support categories", async () => {
        const { categories } = await runVitestInlineTest({
          "sample.test.ts": `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
          "vitest.config.ts": configFileAccessor,
        });

        expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
      });
    });
  }
});
