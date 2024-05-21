import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../../utils.js";

it("sets test display name", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";
    import { displayName } from "allure-js-commons";

    test("display name", async () => {
      await displayName("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
