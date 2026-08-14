import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it("should preserve fullName format and include fallback testCaseId", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test 1', async () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].fullName).toMatch(/^sample\.test\.js:\d+:\d+$/);
  expect(tests[0].testCaseId).toBe(md5("dummy:sample.test.js#test 1"));
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5("sample.test.js#test 1"),
      },
    ]),
  );
});

it("should report a playwrightTestId label stable across source-location changes", async () => {
  const specSource = (leadingBlankLines: string) => `${leadingBlankLines}
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 1', async () => {});
      });
    `;
  const projectFiles = {
    "package.json": JSON.stringify({ name: "dummy" }),
    "playwright.config.js": `
      module.exports = {
        reporter: [["allure-playwright"]],
        projects: [{ name: "project" }],
      };
    `,
  };

  const before = await runPlaywrightInlineTest({ ...projectFiles, "sample.test.js": specSource("") });
  const after = await runPlaywrightInlineTest({ ...projectFiles, "sample.test.js": specSource("\n\n\n") });

  const playwrightTestIdOf = (tests: (typeof before)["tests"]) =>
    tests[0].labels.find((label) => label.name === "playwrightTestId")?.value;

  expect(before.tests[0].fullName).not.toBe(after.tests[0].fullName);
  expect(playwrightTestIdOf(before.tests)).toBeTruthy();
  expect(playwrightTestIdOf(before.tests)).toBe(playwrightTestIdOf(after.tests));
});
