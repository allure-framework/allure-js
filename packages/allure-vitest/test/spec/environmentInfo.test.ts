import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("environment info", () => {
  it("should add environmentInfo", async () => {
    const { envInfo } = await runVitestInlineTest(
      `
    import { test } from "vitest";

    test("sample test", async () => {
    });
  `,
      (testDir) => `
    import { defineConfig } from "vitest/config";

    export default defineConfig({
      test: {
        setupFiles: ["allure-vitest/setup"],
        reporters: [
          "default",
          [
            "allure-vitest/reporter",
            {
              testMode: true,
              resultsDir: "${join(testDir, "allure-results")}",
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
    );

    expect(envInfo).toEqual({ "app version": "123.0.1", "some other key": "some other value" });
  });
});
