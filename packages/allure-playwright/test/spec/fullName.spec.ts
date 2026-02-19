import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
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
