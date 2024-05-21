import { describe, expect, it } from "@jest/globals";
import { runJestInlineTest } from "../../../utils";

describe("historyId", () => {
  it("historyId", async () => {
    const { tests } = await runJestInlineTest(`
      const { historyId } = require("allure-js-commons");

      it("historyId", async () => {
        await historyId("foo");
      })
    `);

    expect(tests).toHaveLength(1);
    expect(tests[0].historyId).toBe("foo");
  });
});
