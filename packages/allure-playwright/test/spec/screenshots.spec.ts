import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should support playwright screenshots/image diffs", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('test full report', async ({ page }) => {
        await page.goto("https://allurereport.org");
        await expect(page.locator("body")).toHaveScreenshot();
      });
    `,
  });

  debugger

  expect(tests).toHaveLength(1);

  // expect(tests).toEqual(
  //   expect.arrayContaining([
  //     expect.objectContaining({
  //       name: "test full report",
  //       status: "skipped",
  //       statusDetails: expect.objectContaining({
  //         message: "skipped via skip annotation",
  //       }),
  //     }),
  //   ]),
  // );
});
