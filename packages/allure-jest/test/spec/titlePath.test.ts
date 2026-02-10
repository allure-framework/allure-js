import { expect, it } from "vitest";
import { runJestInlineTest } from "../utils.js";

it("should assign titlePath property to the test result", async () => {
  const { tests } = await runJestInlineTest({
    "foo/bar/baz/sample.test.js": `
      it("should pass", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["allure-jest", "foo", "bar", "baz", "sample.test.js"]);
});

it("should assign titlePath property to the test result with suites", async () => {
  const { tests } = await runJestInlineTest({
    "foo/bar/baz/sample.test.js": `
      describe("foo", () => {
        describe("bar", () => {
          it("should pass", () => {
            expect(true).toBe(true);
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["allure-jest", "foo", "bar", "baz", "sample.test.js", "foo", "bar"]);
});
