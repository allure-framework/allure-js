import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("global labels", () => {
  it("should handle global labels", async () => {
    const { tests } = await runVitestInlineTest(
      `
        import { test } from "vitest";

        test("sample test", async () => {
        });
      `,
      {
        configFactory: () => `
          import { defineConfig } from "vitest/config";

          export default defineConfig({
            test: {
              setupFiles: ["allure-vitest/setup"],
              reporters: [
                "default",
                [
                  "allure-vitest/reporter",
                  {
                    resultsDir: "allure-results",
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
      },
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toEqual(expect.arrayContaining([
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
    ]));
  });
});
