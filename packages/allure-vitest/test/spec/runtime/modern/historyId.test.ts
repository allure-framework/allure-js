import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../../utils.js";

it("sets test history id", async () => {
  const { tests } = await runVitestInlineTest({
    "sample.test.ts": `
    import { test } from "vitest";
    import { historyId } from "allure-js-commons";

    test("history id", async () => {
      await historyId("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
