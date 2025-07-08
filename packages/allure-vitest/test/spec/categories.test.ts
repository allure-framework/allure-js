import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("categories", () => {
  it("should support categories", async () => {
    const { categories } = await runVitestInlineTest({
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
        `,
    });

    expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
  });
});
