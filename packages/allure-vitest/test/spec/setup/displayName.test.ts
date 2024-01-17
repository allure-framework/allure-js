import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../utils.js";

it("sets test display name", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("display name", () => {
      this.allure.displayName("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
