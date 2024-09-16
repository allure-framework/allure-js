import { describe, expect, it } from "vitest";
import { runMochaInlineTest } from "../../utils.js";

describe("testCaseId calculation", () => {
  it("should take into account test file paths", async () => {
    const { tests } = await runMochaInlineTest(["collision", "foo"], ["collision", "bar"]);

    expect(tests).toHaveLength(2);
    const [{ testCaseId: testCaseId1 }, { testCaseId: testCaseId2 }] = tests;
    expect(testCaseId1).not.toEqual(testCaseId2);
  });
});
