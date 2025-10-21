import { createServer } from "node:http";
import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

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
