import { expect, test } from "./fixtures";

test("should create playwright commands log and attach it as json file to the test", async ({
  runInlineTest,
}) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      import { allure } from '../../dist/index'
      test('should search the result', async ({ page }, testInfo) => {
        await allure.attachLogger(page)
        await page.goto('https://duckduckgo.com/');

        const submitButton = await page.waitForSelector('form[role=search] button[type=submit]');

        await page.type('form[role=search] input[type=text]', 'query')
        await submitButton.click()
        await page.waitForSelector('[data-testid=result]')
      });
    `,
    reporterOptions: JSON.stringify({ detail: false }),
  });

  const testResult = results.tests[0];

  expect(testResult.attachments).toEqual([
    expect.objectContaining({ name: "allure-inspector-log.json", type: "application/json" }),
  ]);

  const attachment = Buffer.from(
    results.attachments[testResult.attachments[0].source] as string,
    "base64",
  ).toString();

  expect(JSON.parse(attachment)).toEqual([
    {
      fullPath: "form[role=search] button[type=submit]",
      type: "css",
      urls: ["https://duckduckgo.com/"],
    },
    {
      fullPath: "form[role=search] input[type=text]",
      type: "css",
      urls: ["https://duckduckgo.com/"],
    },
    {
      fullPath: "form[role=search] button[type=submit]",
      type: "css",
      urls: ["https://duckduckgo.com/"],
    },
    {
      fullPath: "[data-testid=result]",
      type: "css",
      urls: ["https://duckduckgo.com/?t=h_&q=query"],
    },
  ]);
});
