import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("environment info", () => {
  it("should add environmentInfo", async () => {
    const { envInfo } = await runVitestInlineTest({
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
                  environmentInfo: {
                    "app version": "123.0.1",
                    "some other key": "some other value"
                  }
                }
              ],
            ],
          },
        });
      `,
    });

    expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
  });
});
