import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

describe("testCaseId", () => {
  it("testCaseId", async () => {
    const { tests } = await runJestInlineTest({
      "sample.test.js": `
      it("testCaseId", async () => {
        await allure.testCaseId("foo");
      })
    `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].testCaseId).toBe("foo");
  });
});
