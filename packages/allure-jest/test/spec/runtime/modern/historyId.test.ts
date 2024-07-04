import { describe, expect, it } from "vitest";
import { runJestInlineTest } from "../../../utils.js";

describe("historyId", () => {
  it("historyId", async () => {
    const { tests } = await runJestInlineTest({
      "sample.test.js": `
      const { historyId } = require("allure-js-commons");

      it("historyId", async () => {
        await historyId("foo");
      })
    `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].historyId).toBe("foo");
  });
});
