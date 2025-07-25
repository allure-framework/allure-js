import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("doesn't not throw on missing attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should add attachment', async ({}, testInfo) => {
        testInfo.attachments.push({
          name: 'file-attachment',
          path: 'does-not-exist.txt',
          contentType: 'text/plain'
        });

        testInfo.attachments.push({
          name: 'buffer-attachment',
          body: Buffer.from('foo'),
          contentType: 'text/plain'
        });
      });
    `,
  });

  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "buffer-attachment",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "buffer-attachment",
          type: "text/plain",
        }),
      ]),
    }),
  );
});

it("adds snapshots correctly and provide a screenshot diff", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should add attachment', async ({ page }, testInfo) => {
        testInfo.snapshotSuffix = '';

        test.expect(await page.screenshot()).toMatchSnapshot("foo.png");
      });
    `,
    "sample.test.js-snapshots/foo-project.png": readFileSync(
      resolve(__dirname, "../samples/attachment-1-not-expected.png"),
    ),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toContainEqual({
    name: "foo",
    type: "application/vnd.allure.image.diff",
    source: expect.stringMatching(/.*\.imagediff/),
  });
});

it("adds trace to the report as an attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';
      import * as allure from "allure-js-commons";
      import { ContentType } from "allure-js-commons";

      test('should do nothing', async ({ page }, testInfo) => {
        await allure.attachment("trace", "trace", ContentType.JPEG);

      });
    `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         outputDir: "./test-results",
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
         ],
         projects: [
           {
             name: "project",
           },
         ],
         use: {
           trace: "on",
         }
      };
    `,
  });

  expect(tests[0].steps).toHaveLength(2);
  expect(tests[0].steps[0]).toMatchObject({
    name: "trace",
    attachments: [
      expect.objectContaining({
        name: "trace",
        type: "image/jpeg",
      }),
    ],
  });
  expect(tests[0].steps[1]).toMatchObject({
    name: "trace",
    attachments: [
      expect.objectContaining({
        name: "trace",
        type: "application/vnd.allure.playwright-trace",
        source: expect.stringMatching(/.*\.zip/),
      }),
    ],
  });
});

it("adds trace from stopChunk to the report as an attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';
      import { attachTrace } from "allure-js-commons";

      test('should do nothing', async ({ page, context }, testInfo) => {
        await context.tracing.start({ screenshots: true, snapshots: true });
        await page.goto('https://playwright.dev');
        const chunkPath = 'allure-results/trace-chunk.zip';
        await context.tracing.stopChunk({ path: chunkPath });
        await attachTrace("trace-chunk", chunkPath);
      });
    `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         outputDir: "./test-results",
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

  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "trace-chunk",
    attachments: [
      expect.objectContaining({
        name: "trace-chunk",
        type: "application/vnd.allure.playwright-trace",
        source: expect.stringMatching(/.*\.zip/),
      }),
    ],
  });
});
