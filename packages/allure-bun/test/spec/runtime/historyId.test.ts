import { describe, expect, it } from "vitest";

import { runBunInlineTest } from "../../utils.js";

describe("historyId", () => {
  it("sets test history id", async () => {
    const { tests, exitCode } = await runBunInlineTest({
      "sample.test.ts": `
        import { test } from "bun:test";
        import { historyId } from "allure-js-commons";

        test("history id", async () => {
          await historyId("manual-history");
        });
      `,
    });

    expect(exitCode).toBe(0);
    expect(tests).toHaveLength(1);
    expect(tests[0].historyId).toBe("manual-history");
  });
});
