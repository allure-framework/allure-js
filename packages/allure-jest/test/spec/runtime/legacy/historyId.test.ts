import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

describe("historyId", () => {
  it("historyId", async () => {
    const { tests } = await runJestInlineTest({
      "sample.test.js": `
      it("historyId", async () => {
        await allure.historyId("foo");
      })
    `
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].historyId).toBe("foo");
  });
});
