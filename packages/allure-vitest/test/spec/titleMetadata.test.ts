import { describe, expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../utils.js";

describe("title metadata", () => {
  it("should add metadata from the test name", async () => {
    const { tests } = await runVitestInlineTest({
      "sample.test.ts": `
        import { test } from "vitest";

        test("foo @allure.id=1 @allure.label.bar=2 @allure.link.my_link=https://allurereport.org", () => {});
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0]).toMatchObject({
      name: "foo",
      fullName: "dummy:sample.test.ts#foo",
      labels: expect.arrayContaining([
        { name: LabelName.ALLURE_ID, value: "1" },
        { name: "bar", value: "2" },
      ]),
      links: expect.arrayContaining([{ type: "my_link", url: "https://allurereport.org" }]),
    });
  });
});
