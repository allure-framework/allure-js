import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("doesn't not throw on missing attachment", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
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

  expect(tests[0].attachments).toEqual([
    expect.objectContaining({
      name: "buffer-attachment",
      type: "text/plain",
    }),
  ]);
  expect(attachments[tests[0].attachments[0].source]).toEqual(Buffer.from("foo").toString("base64"));
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
      resolve(__dirname, "../assets/attachment-1-not-expected.png"),
    ),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toContainEqual({
    name: "foo",
    type: "application/vnd.allure.image.diff",
    source: expect.stringMatching(/.*\.imagediff/),
  });
});
