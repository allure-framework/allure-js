import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("sets description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { description } from "allure-vitest";

    test("description", async (t) => {
      await description(t, "foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { descriptionHtml } from "allure-vitest";

    test("description html", async (t) => {
      await descriptionHtml(t, "foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
