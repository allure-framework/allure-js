import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runPlaywrightInlineTest } from "../utils.js";

it("historical data should be fine", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {});
      });
      `,
  });
  const fullName = "sample.test.js:5:13";
  const testCaseId = md5("dummy:sample.test.js#nested test");
  const [testResult] = tests;

  expect(testResult).toEqual(
    expect.objectContaining({
      name: "test",
      fullName,
    }),
  );
  expect(testResult.testCaseId).toBe(testCaseId);
  expect(testResult.historyId).toBe(`${testCaseId}:${md5("Project:project")}`);
  expect(testResult.labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5("sample.test.js#nested test"),
      },
    ]),
  );
});
