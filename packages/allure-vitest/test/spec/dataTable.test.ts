import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("handles data table", async () => {
  const { tests } = await runVitestInlineTest(`
    import { test, expect } from "vitest";
    import { label } from "allure-js-commons/new";

    test.each([
      [1, 1, 2],
      [1, 2, 3],
      [2, 1, 3],
    ])("%i + %i = %i", async (a, b, expected) => {
      await label("foo", "bar");
    })
  `);

  expect(tests).toHaveLength(3);
  expect(tests[0].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
  expect(tests[1].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
  expect(tests[2].labels).toContainEqual(expect.objectContaining({ name: "foo", value: "bar" }));
});
