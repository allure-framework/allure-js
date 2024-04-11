import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets test case id", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { testCaseId } from "allure-js-commons/new/async";

    test("test case id", async () => {
      await testCaseId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
