import { expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils";

it("sets description", async () => {
  const { tests } = await runJestInlineTest(`
      it("description", async () => {
        await allure.description("foo");
      })
    `);

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("sets html description", async () => {
  const { tests } = await runJestInlineTest(`
      it("descriptionHtml", async () => {
        await allure.descriptionHtml("foo");
      })
    `);

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
