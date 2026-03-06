import type { AllureResults } from "allure-js-commons/sdk";
import { beforeAll, describe, expect, it } from "vitest";

import { runMochaInlineTest } from "../../utils.js";

describe("environment info", () => {
  let results: AllureResults;
  beforeAll(async () => {
    results = await runMochaInlineTest(
      {
        environmentInfo: {
          a: "b",
          c: "d",
        },
      },
      ["plain-mocha", "testInSuite"],
    );
  });

  it("should store environment info", () => {
    const { envInfo } = results;
    expect(envInfo).toEqual({
      a: "b",
      c: "d",
    });
  });
});
