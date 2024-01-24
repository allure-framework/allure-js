import { describe, expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

describe("description", () => {
  it("description", async () => {
    const { tests } = await runJestInlineTest(`
      it("description", async () => {
        await allure.description("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].description).toBe("foo");
  });

  it("descriptionHtml", async () => {
    const { tests } = await runJestInlineTest(`
      it("descriptionHtml", async () => {
        await allure.descriptionHtml("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].descriptionHtml).toBe("foo");
  });
});
