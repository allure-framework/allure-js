import { describe, expect, it } from "@jest/globals";
import { runJestInlineTest } from "../utils";

describe("testCaseId", () => {
  it("testCaseId", async () => {
    const { tests } = await runJestInlineTest(`
      it("testCaseId", async () => {
        await allure.testCaseId("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].testCaseId).toBe("foo");
  });
});
