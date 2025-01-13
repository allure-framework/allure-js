import { beforeAll, describe, expect, it } from "vitest";
import type { AllureResults } from "allure-js-commons/sdk";
import { runMochaInlineTest } from "../../utils.js";

describe("global labels", () => {
  let results: AllureResults;

  beforeAll(async () => {
    results = await runMochaInlineTest(
      {
        globalLabels: [
          {
            name: "foo",
            value: "bar",
          },
        ],
      },
      ["plain-mocha", "testInSuite"],
    );
  });

  it("handles global labels", () => {
    expect(results.tests).toHaveLength(1);
    expect(results.tests[0].labels[0]).toEqual({
      name: "foo",
      value: "bar",
    });
  });
});
