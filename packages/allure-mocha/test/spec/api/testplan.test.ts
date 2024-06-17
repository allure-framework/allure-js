import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("testplan", () => {
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
