import { describe, expect, it } from "vitest";
import { runVitestInlineTest } from "../utils.js";

describe("test plan", () => {
  it("should support test plan", async () => {
    const { tests } = await runVitestInlineTest(
      `
      import { test, describe } from "vitest";

      test("foo", () => {});

      test("bar", () => {});

      test("baz @allure.id=2", () => {});

      test("beep @allure.id=3", () => {});

      describe("foo", () => {
        describe("bar", () => {
          test("boop", () => {});
        });
      });

      export const testFixture = test.extend({
      dummy: async ({}, use) => {
        await use("fixture data");
      },
      });

      testFixture("fixture test", async ({ dummy }) => {
        await logStep(dummy);
      });
    `,
      {
        testplan: {
          version: "1.0",
          tests: [{ selector: "foo/sample.test.ts#baz" }, { id: 3 }, { selector: "foo/sample.test.ts#foo bar boop" }],
        },
        specPath: "foo/sample.test.ts",
      },
    );

    expect(tests).toHaveLength(3);
    expect(tests).toContainEqual(expect.objectContaining({ name: "baz", fullName: "foo/sample.test.ts#baz" }));
    expect(tests).toContainEqual(expect.objectContaining({ name: "beep", fullName: "foo/sample.test.ts#beep" }));
    expect(tests).toContainEqual(
      expect.objectContaining({ name: "boop", fullName: "foo/sample.test.ts#foo bar boop" }),
    );
  });
});
