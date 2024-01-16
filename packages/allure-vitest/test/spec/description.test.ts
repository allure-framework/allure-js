import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { allureTest } from "allure-vitest/test";

    allureTest("description", ({ allure }) => {
      allure.description("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { allureTest } from "allure-vitest/test";

    allureTest("description html", ({ allure }) => {
      allure.descriptionHtml("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
