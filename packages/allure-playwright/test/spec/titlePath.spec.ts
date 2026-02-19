import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should assign titlePath property to the test result", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "foo/bar/sample.test.js": `
      import { test } from '@playwright/test';

      test("sample test", async () => {});
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["dummy", "foo", "bar", "sample.test.js"]);
});

it("should assign titlePath property to the test result with suites", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "foo/bar/sample.test.js": `
      import { test } from '@playwright/test';

      test.describe("foo", () => {
        test.describe("bar", () => {
          test("sample test ", async () => {});
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);

  const [tr] = tests;

  expect(tr.titlePath).toEqual(["dummy", "foo", "bar", "sample.test.js", "foo", "bar"]);
});
