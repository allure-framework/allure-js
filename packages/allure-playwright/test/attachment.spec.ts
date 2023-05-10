/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import fs from "fs";
import { expect, test } from "./fixtures";

test("should not throw on missing attachment", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
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
  expect(results.tests[0].attachments).toEqual([
    expect.objectContaining({ name: "buffer-attachment", type: "text/plain" }),
  ]);

  expect(results.attachments[results.tests[0].attachments[0].source]).toEqual(
    Buffer.from("foo").toString("base64"),
  );
});

test("should add snapshots correctly and provide a screenshot diff", async ({
  runInlineTest,
  attachment,
}) => {
  const result = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      test('should add attachment', async ({ page }, testInfo) => {
        testInfo.snapshotSuffix = '';
        test.expect(await page.screenshot()).toMatchSnapshot("foo.png");
      });
    `,
    "a.test.ts-snapshots/foo-project.png": fs.readFileSync(
      attachment("attachment-1-not-expected.png"),
    ),
  });
  expect(result.tests[0].attachments).toEqual(
    expect.arrayContaining([
      {
        name: "foo",
        type: "application/vnd.allure.image.diff",
        source: expect.stringMatching(/.*\.imagediff/),
      },
    ]),
  );
});
