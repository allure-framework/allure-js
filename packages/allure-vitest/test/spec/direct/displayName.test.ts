import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("sets test display name", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { displayName } from "allure-vitest";

    test("display name", async (t) => {
      await displayName(t, "foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
