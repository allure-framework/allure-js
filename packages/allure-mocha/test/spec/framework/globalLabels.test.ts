import { describe, expect, it } from "vitest";
import type { AllureResults } from "allure-js-commons/sdk";
import { runMochaInlineTest } from "../../utils.js";

describe("global labels", () => {
  let results: AllureResults;

  it("should handle global labels", async () => {
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

    expect(results.tests).toHaveLength(1);
    expect(results.tests[0].labels[0]).toEqual({
      name: "foo",
      value: "bar",
    });
  });

  it("should handle global labels as map", async () => {
    results = await runMochaInlineTest(
      {
        globalLabels: {
          foo: "bar",
          bar: ["beep", "boop"],
        }
      },
      ["plain-mocha", "testInSuite"],
    );

    expect(results.tests).toHaveLength(1);
    expect(results.tests[0].labels).toEqual(expect.arrayContaining([
      {
        name: "foo",
        value: "bar",
      },
      {
        name: "bar",
        value: "beep",
      },
      {
        name: "bar",
        value: "boop",
      },
    ]));
  });
});
