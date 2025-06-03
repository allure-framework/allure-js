import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("titlePath", () => {
  let tests: TestResult[];

  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(["plain-mocha", "titlePath"]));
  });

  it("should assign titlePath property to the test result", () => {
    const [tr] = tests;

    expect(tr.titlePath).toEqual(["plain-mocha", expect.stringMatching(/titlePath\.spec\.(m|c)?js/)]);
  });

  it("should assign titlePath property to the test result with suites", () => {
    const [, tr] = tests;

    expect(tr.titlePath).toEqual(["plain-mocha", expect.stringMatching(/titlePath\.spec\.(m|c)?js/), "foo", "bar"]);
  });
});
