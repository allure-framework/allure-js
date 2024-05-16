import { expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

it("sets description", async () => {
  const { tests } = await runJestInlineTest(`
      const { description } = require("allure-js-commons");

      it("description", async () => {
        await description("foo");
      })
    `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runJestInlineTest(`
      const { descriptionHtml } = require("allure-js-commons");

      it("descriptionHtml", async () => {
        await descriptionHtml("foo");
      })
    `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
