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

test("should report test status details", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test, expect } from '@playwright/test';
      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });
    `,
  });
  expect(results.tests).toEqual([
    expect.objectContaining({
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("Object.is equality"),
        trace: expect.stringMatching(/^\s*at\s/),
      }),
    }),
  ]);
});
