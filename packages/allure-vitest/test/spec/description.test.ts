import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("sets description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { description } from "allure-js-commons/new";

    test("description", async () => {
      await description("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { descriptionHtml } from "allure-js-commons/new";

    test("description html", async () => {
      await descriptionHtml("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
