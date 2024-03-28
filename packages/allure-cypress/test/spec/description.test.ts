import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils";

it("description", async () => {
  const { tests } = await runCypressInlineTest(`
    import { description } from "allure-cypress";

    it("markdown", () => {
      description("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo")
});

it("descriptionHtml", async () => {
  const { tests } = await runCypressInlineTest(`
    import { descriptionHtml } from "allure-cypress";

    it("html", () => {
      descriptionHtml("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo")
});
