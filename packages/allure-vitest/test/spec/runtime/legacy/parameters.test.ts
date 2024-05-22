import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../../utils.js";

it("sets parameters", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test } from "vitest";

    test("parameter", async () => {
      await allure.parameter("foo", "bar", { mode: "hidden", excluded: true });
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].parameters).toContainEqual({
    name: "foo",
    value: "bar",
    mode: "hidden",
    excluded: true,
  });
});
