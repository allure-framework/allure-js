import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils";

describe("testCaseId", () => {
  it("testCaseId", async () => {
    const { tests } = await runJestInlineTest(`
      const { testCaseId } = require("allure-js-commons");

      it("testCaseId", async () => {
        await testCaseId("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].testCaseId).toBe("foo");
  });
});
