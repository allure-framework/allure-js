import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("fixtures", () => {
  it("should report fixtures", async () => {
    const { tests } = await runVitestInlineTest(`
    import { afterAll, afterEach, beforeAll, beforeEach, test } from "vitest";
    import { step } from "allure-js-commons";

    beforeAll(async () => {
      await step("before all step", () => {});
    });

    afterAll(async () => {
      await step("after all step", () => {});
    });

    beforeEach(async () => {
      await step("before each step", () => {});
    });

    afterEach(async () => {
      await step("after each step", () => {});
    });

    test("sample test", async () => {
      await step("test step", () => {});
    });
  `);

    expect(tests).toHaveLength(1);
    const [testResult] = tests;
    expect(testResult.steps).toEqual([
      expect.objectContaining({
        name: "before all step",
      }),
      expect.objectContaining({
        name: "before each step",
      }),
      expect.objectContaining({
        name: "test step",
      }),
      expect.objectContaining({
        name: "after each step",
      }),
      expect.objectContaining({
        name: "after all step",
      }),
    ]);
  });
});
