import { beforeAll, describe, expect, it } from "vitest";

import { type TestFileAccessor, reporterModulePath, runVitestInlineTest } from "../utils.js";

describe("global labels", () => {
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
            reporters: [
              "default",
              [
                "${reporterModulePath}",
                {
                  resultsDir: "${allureResultsPath}",
                    globalLabels: {
                      foo: "bar",
                      bar: ["beep", "boop"],
                    }
                }
              ],
            ],
          },
        });
      `;
          }
          return `
        import { defineConfig } from "vitest/config";
        import { playwright } from "@vitest/browser-playwright";

        export default defineConfig({
          test: {
            openTelemetry: { enabled: false },
            reporters: [
              "default",
              [
                "${reporterModulePath}",
                {
                  resultsDir: "${allureResultsPath}",
                    globalLabels: {
                      foo: "bar",
                      bar: ["beep", "boop"],
                    }
                }
              ],
            ],
            browser: {
              provider: playwright(),
              enabled: true,
              headless: true,
              instances: [{ browser: "chromium" }],
            },
          },
        });
      `;
        };
      });

      it("should handle global labels", async () => {
        const { tests } = await runVitestInlineTest({
          "sample.test.ts": `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
          "vitest.config.ts": configFileAccessor,
        });

        expect(tests).toHaveLength(1);
        expect(tests[0].labels).toEqual(
          expect.arrayContaining([
            {
              name: "foo",
              value: "bar",
            },
            {
              name: "bar",
              value: "beep",
            },
            {
              name: "bar",
              value: "boop",
            },
          ]),
        );
      });
    });
  }
});
