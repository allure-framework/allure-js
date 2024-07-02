import { beforeAll, describe, expect, it } from "vitest";
import type { AllureResults } from "allure-js-commons/sdk";
import { runMochaInlineTest } from "../../utils.js";

describe("categories", () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest(
      {
        categories: [{ name: "category 1", status: "failed" }],
      },
      ["plain-mocha", "testInSuite"],
    );
  });

  it("should store categories", () => {
    const { categories } = results;
    expect(categories).toEqual([{ name: "category 1", status: "failed" }]);
  });
});
