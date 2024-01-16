import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets test case id", async () => {
  const { tests } = await runVitestInlineTest(`
    import { allureTest } from "allure-vitest/test";

    allureTest("test case id", ({ allure }) => {
      allure.testCaseId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
