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

import { expect, test } from "./fixtures";

test("should add attachments into steps", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      import { allure } from '../../dist/index'
      test('should add attachment', async ({}, testInfo) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
            await allure.attachment('some', 'some-data', 'text/plain');
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
          });
          await test.step('inner step 2.2', async () => {
            await allure.attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    reporterOptions: JSON.stringify({ detail: false }),
  });
  const testResult = results.tests[0];

  expect(testResult.steps[0].name).toBe("outer step 1");
  expect(testResult.steps[0].steps[0].name).toBe("inner step 1.1");
  expect(testResult.steps[0].steps[0].steps[0].name).toBe("some");

  expect(testResult.steps[0].steps[0].steps[0].attachments).toEqual([
    expect.objectContaining({ name: "some", type: "text/plain" }),
  ]);

  const content1 = results.attachments[
    testResult.steps[0].steps[0].steps[0].attachments[0].source
  ] as string;
  expect(Buffer.from(content1, "base64").toString()).toEqual("some-data");

  expect(testResult.steps[1].name).toBe("outer step 2");
  expect(testResult.steps[1].steps[1].name).toBe("inner step 2.2");
  expect(testResult.steps[1].steps[1].steps[0].name).toBe("some");

  expect(testResult.steps[1].steps[1].steps[0].attachments).toEqual([
    expect.objectContaining({ name: "some", type: "text/plain" }),
  ]);

  const content2 = results.attachments[
    testResult.steps[1].steps[1].steps[0].attachments[0].source
  ] as string;
  expect(Buffer.from(content2, "base64").toString()).toEqual("other-data");
});

test("should not report detail steps for attachments", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      import { allure } from '../../dist/index'
      test('should add attachment', async ({}, testInfo) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
            await allure.attachment('some', 'some-data', 'text/plain');
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
          });
          await test.step('inner step 2.2', async () => {
            await allure.attachment('some', 'other-data', 'text/plain');
          });
        });
      });
    `,
    reporterOptions: JSON.stringify({ detail: true }),
  });
  const testResult = results.tests[0];

  expect(testResult.steps[1].name).toBe("outer step 1");
  expect(testResult.steps[1].steps[0].name).toBe("inner step 1.1");
  expect(testResult.steps[1].steps[0].steps[0].name).toBe("some");

  expect(testResult.steps[1].steps[0].steps[0].attachments).toEqual([
    expect.objectContaining({ name: "some", type: "text/plain" }),
  ]);
  expect(testResult.steps[1].steps[0].steps[0].steps).toHaveLength(0);

  expect(testResult.steps[2].name).toBe("outer step 2");
  expect(testResult.steps[2].steps[1].name).toBe("inner step 2.2");
  expect(testResult.steps[2].steps[1].steps[0].name).toBe("some");

  expect(testResult.steps[2].steps[1].steps[0].attachments).toEqual([
    expect.objectContaining({ name: "some", type: "text/plain" }),
  ]);

  expect(testResult.steps[2].steps[1].steps[0].steps).toHaveLength(0);
});
