import type { TestResult } from "allure-js-commons";
import { beforeAll, describe, expect, it } from "vitest";

import { runMochaInlineTest } from "../../utils.js";

describe("testplan", () => {
  it.each([
    { mutedTests: [{ id: 77 }] },
    { mutedTests: [{ selector: [["plain-mocha", "muted"], "muted test @allure.id=77"] as [string[], string] }] },
    { testplan: [], mutedTests: [{ id: 77 }] },
    { testplan: [{ id: 77 }, { id: 78 }], mutedTests: [{ id: 77 }] },
  ])("excludes muted bodies: %j", async (config) => {
    const { tests, exitCode } = await runMochaInlineTest(config, ["plain-mocha", "muted"]);

    expect(exitCode).toBe(0);
    expect(tests).toEqual([expect.objectContaining({ name: "survivor", status: "passed" })]);
  });

  describe("by selector", () => {
    let tests: TestResult[];
    beforeAll(async () => {
      ({ tests } = await runMochaInlineTest(
        {
          testplan: [{ selector: [["plain-mocha", "testInFileScope"], "a test in a file scope"] }],
        },
        ["plain-mocha", "testInFileScope"],
        ["plain-mocha", "testInSuite"],
      ));
    });

    it("selects only one test by fullName", () => {
      expect(tests).toEqual([expect.objectContaining({ name: "a test in a file scope" })]);
    });
  });

  describe("by id", () => {
    let tests: TestResult[];
    beforeAll(async () => {
      ({ tests } = await runMochaInlineTest(
        { testplan: [{ id: 1004 }] },
        ["labels", "meta", "id", "1004"],
        ["labels", "meta", "id", "1005"],
      ));
    });

    it("selects only one test by ID", () => {
      expect(tests).toEqual([expect.objectContaining({ name: "a test with ID 1004" })]);
    });
  });
});
