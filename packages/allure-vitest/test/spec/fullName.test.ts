import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("full name", () => {
  it("should set full name", async () => {
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
});
