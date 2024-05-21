import { describe, expect, it } from "@jest/globals";
import { runJestInlineTest } from "../../../utils";

describe("historyId", () => {
  it("historyId", async () => {
    const { tests } = await runJestInlineTest(`
      it("historyId", async () => {
        await allure.historyId("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].historyId).toBe("foo");
  });
});
