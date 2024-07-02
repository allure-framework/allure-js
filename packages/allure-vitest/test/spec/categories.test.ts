import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("categories", () => {
  it("should support categories", async () => {
    const { categories } = await runVitestInlineTest(
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
              resultsDir: "${join(testDir, "allure-results")}",
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
    );

    expect(categories).toEqual(expect.arrayContaining([{ name: "first" }, { name: "second" }]));
  });
});
