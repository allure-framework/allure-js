import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("global labels", () => {
  it("should handle global labels", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
      "vitest.config.ts": ({ allureResultsPath, reporterModulePath, setupModulePath }) => `
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
                    globalLabels: {
                      foo: "bar",
                      bar: ["beep", "boop"],
                    }
                }
              ],
            ],
          },
        });
      `,
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
