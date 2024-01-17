import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("sets test history id", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { historyId } from "allure-vitest";

    test("history id", async (t) => {
      await historyId(t, "foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
