import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it("should use a stable fullName and include fallback testCaseId", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test 1', async () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].fullName).toBe("sample.test.js › test 1");
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

it("should use legacy fullName format when enabled", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "playwright.config.js": `
      module.exports = {
        reporter: [["allure-playwright", { useLegacyFullName: true }]],
        projects: [{ name: "project" }],
      };
    `,
    "sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 1', async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].fullName).toBe("sample.test.js#nested test 1");
  expect(tests[0].testCaseId).toBe(md5("dummy:sample.test.js#nested test 1"));
});
