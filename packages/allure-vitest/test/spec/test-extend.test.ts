import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("test.extend", () => {
  it("should support test.extend", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
    import { test as baseTest, expect } from "vitest";
    import { logStep } from "allure-js-commons";

    baseTest("base test", async () => {
    });

    export const testFixture = baseTest.extend({
      dummy: async ({}, use) => {
        await use("fixture data");
      },
    });

    testFixture("fixture test", async ({ dummy }) => {
      await logStep(dummy);
    });
  `,
    });

    expect(tests).toHaveLength(2);
    expect(tests).toEqual([
      expect.objectContaining({
        name: "base test",
        status: "passed",
      }),
      expect.objectContaining({
        name: "fixture test",
        status: "passed",
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "fixture data",
            status: "passed",
          }),
        ]),
      }),
    ]);
  });
});
