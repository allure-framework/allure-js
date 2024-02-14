import { expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

it("correctly sets fullName property", async () => {
  const { tests } = await runVitestInlineTest(
    `
      import { test, describe } from "vitest";

      describe("foo", () => {
        describe("bar", () => {
          test("baz", () => {});
        })
      })
    `,
    undefined,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].fullName).toBe("sample.test.ts#foo bar baz");
});
