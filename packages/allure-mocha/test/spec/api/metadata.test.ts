import { beforeAll, describe, expect, it } from "vitest";
import type { TestResult } from "allure-js-commons";
import { runMochaInlineTest } from "../../utils.js";

describe("embedded metadata", () => {
  let tests: TestResult[];
  beforeAll(async () => {
    ({ tests } = await runMochaInlineTest(
      ["labels", "meta", "id", "1004"],
      ["labels", "meta", "single"],
      ["labels", "meta", "multiple"],
      ["labels", "meta", "change"],
    ));
  });

  it("may apply an Allure ID", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with ID 1004",
        labels: expect.arrayContaining([
          {
            name: "ALLURE_ID",
            value: "1004",
          },
        ]),
      }),
    );
  });

  it("may apply a custom label", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test with an embedded custom label",
        labels: expect.arrayContaining([
          {
            name: "foo",
            value: "bar",
          },
        ]),
      }),
    );
  });

  it("may apply multiple labels", () => {
    expect(tests).toContainEqual(
      expect.objectContaining({
        name: "a test two embedded custom label",
        labels: expect.arrayContaining([
          {
            name: "foo",
            value: "bar",
          },
          {
            name: "baz",
            value: "qux",
          },
        ]),
      }),
    );
  });

  it("meta doesn't affect testCaseId and historyId", () => {
    const [
      {testCaseId: testCaseIdBefore, historyId: historyIdBefore},
      {testCaseId: testCaseIdAfter, historyId: historyIdAfter},
    ] = tests.filter((t) => t.name === "a test a changing meta");

    expect(testCaseIdBefore).toBe(testCaseIdAfter);
    expect(historyIdBefore).toBe(historyIdAfter);
  });
});
