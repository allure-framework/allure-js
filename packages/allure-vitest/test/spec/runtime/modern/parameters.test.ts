import { expect, it } from "vitest";
import { runVitestInlineTest } from "../../../utils.js";

it("sets parameters", async () => {
  const { tests } = await runVitestInlineTest({
    "sample.test.ts": `
    import { test } from "vitest";
    import { parameter } from "allure-js-commons";

    test("parameter", async () => {
      await parameter("foo", "bar", { mode: "hidden", excluded: true });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].parameters).toContainEqual({
    name: "foo",
    value: "bar",
    mode: "hidden",
    excluded: true,
  });
});
