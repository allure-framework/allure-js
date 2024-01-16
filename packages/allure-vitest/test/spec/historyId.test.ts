import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets test history id", async () => {
  const { tests } = await runVitestInlineTest(`
    import { allureTest } from "allure-vitest/test";

    allureTest("history id", ({ allure }) => {
      allure.historyId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
