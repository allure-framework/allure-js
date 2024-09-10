import { describe, expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runVitestInlineTest } from "../utils.js";

describe("title metadata", () => {
  it("should add metadata from the test name", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test } from "vitest";

      test("foo @allure.id=1 @allure.label.foo=2", () => {});
    `,
    );

    expect(tests).toHaveLength(1);
    expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: LabelName.ALLURE_ID, value: "1" }));
    expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "2" }));
  });
});
