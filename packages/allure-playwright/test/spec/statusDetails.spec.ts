import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports test status details", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Object.is equality"),
          trace: expect.stringMatching(/\s*at\s/),
        }),
      }),
    ]),
  );
});
