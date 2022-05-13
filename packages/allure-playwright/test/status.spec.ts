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

test("should report test status", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import { test, expect } from '@playwright/test';
      test('should pass', async ({}) => {
      });
      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });
      test('should break', async ({}) => {
        test.setTimeout(1);
        await new Promise(() => {});
      });
      test('should skip', async ({}) => {
        test.skip(true);
      });
      test('should fixme', async ({}) => {
        test.fixme(true);
      });
      test('should expect fail', async ({}) => {
        test.fail(true);
        expect(true).toBe(false);
      });
    `,
    },
    (writer) => {
      return writer.tests.map((t) => t.status);
    },
  );
  expect(result).toEqual(["passed", "failed", "broken", "skipped", "skipped", "passed"]);
});
