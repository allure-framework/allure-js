import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets test display name", async () => {
  const { tests } = await runVitestInlineTest(`
    import { allureTest } from "allure-vitest/test";

    allureTest("display name", ({ allure }) => {
      allure.displayName("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
