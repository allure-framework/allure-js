import { createServer } from "node:http";

import { ContentType, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it("should attach playwright automatic failure screenshots", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test, { expect } from '@playwright/test';

      test('should fail with a screenshot', async ({ page }) => {
        await page.setContent('<main>actual content</main>');
        await expect(page.locator('main')).toHaveText('expected content');
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             "allure-playwright",
             {
               resultsDir: "./allure-results",
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
             use: {
               screenshot: "only-on-failure",
             },
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    status: Status.FAILED,
    steps: expect.arrayContaining([
      expect.objectContaining({
        name: "screenshot",
        attachments: [
          expect.objectContaining({
            name: "screenshot",
            type: ContentType.PNG,
            source: expect.stringMatching(/.*\.png/),
          }),
        ],
      }),
    ]),
  });

  const screenshotStep = tests[0].steps.find((step) => step.name === "screenshot");
  const screenshotAttachment = screenshotStep?.attachments[0];

  expect(screenshotAttachment?.source && attachments[screenshotAttachment.source]).toBeDefined();
});

it("should handle playwright native screenshot testing", async () => {
  const server = createServer((req, res) => {
    return res.end("Hello, world!");
  });

  server.listen(3000);

  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test, { expect } from '@playwright/test';

      test('should work', async ({ page }) => {
        await page.goto("http://localhost:3000");
        await expect(page.locator('body')).toHaveScreenshot('image.png');
      });
    `,
  });

  server.close();

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    status: Status.FAILED,
    statusDetails: expect.objectContaining({
      message: expect.stringContaining("A snapshot doesn't exist"),
    }),
    steps: expect.arrayContaining([
      expect.objectContaining({
        name: "image-actual.png",
        attachments: [
          expect.objectContaining({
            name: "image-actual.png",
            type: "image/png",
          }),
        ],
      }),
    ]),
  });
});
