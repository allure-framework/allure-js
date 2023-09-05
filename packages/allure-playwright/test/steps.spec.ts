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

test("should report test steps", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test, expect } from '@playwright/test';
      test('should pass', async ({}) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
          });
          await test.step('inner step 2.2', async () => {
          });
        });
      });
    `,
    reporterOptions: JSON.stringify({ detail: false }),
  });
  expect(results.tests).toEqual([
    expect.objectContaining({
      name: "should pass",
      status: "passed",
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: "passed",
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: "passed" }),
            expect.objectContaining({ name: "inner step 1.2", status: "passed" }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: "passed",
          steps: [
            expect.objectContaining({ name: "inner step 2.1", status: "passed" }),
            expect.objectContaining({ name: "inner step 2.2", status: "passed" }),
          ],
        }),
      ],
    }),
  ]);
});

test("should report failed test steps", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test, expect } from '@playwright/test';
      test('should pass', async ({}) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
            expect(true).toBe(false);
          });
          await test.step('inner step 2.2', async () => {
          });
        });
      });
    `,
    reporterOptions: JSON.stringify({ detail: false }),
  });
  expect(results.tests).toEqual([
    expect.objectContaining({
      name: "should pass",
      status: "failed",
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: "passed",
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: "passed" }),
            expect.objectContaining({ name: "inner step 1.2", status: "passed" }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: "failed",
          steps: [
            expect.objectContaining({
              name: "inner step 2.1",
              status: "failed",
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("expect(received).toBe(expected)"),
                trace: expect.stringMatching(
                  /^\s*at\s+.*steps-should-report-failed-test-steps-project\/a\.test\.ts:12:26/,
                ),
              }),
            }),
          ],
        }),
      ],
    }),
  ]);
});
