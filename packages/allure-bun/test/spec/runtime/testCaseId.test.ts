import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";

describe("testCaseId", () => {
  it("sets test case id", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { testCaseId } from "allure-js-commons";

        test("test case id", async () => {
          await testCaseId("manual-case");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].testCaseId).toBe("manual-case");
  });
});
