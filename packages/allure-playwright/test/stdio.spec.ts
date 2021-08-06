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

import { test, expect } from "./fixtures";

test("should report stdout and stderr", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import test from '@playwright/test';
      test('stdout should work', async ({}) => {
        console.log('System out');
        console.error('System err');
      });
    `,
    },
    (writer) => {
      return writer.tests[0].attachments.map((a) => {
        const buffer = writer.attachments[a.source];
        return { name: a.name, type: a.type, buffer };
      });
    },
  );
  expect(result).toEqual([
    { name: "stdout", type: "text/plain", buffer: "System out\n" },
    { name: "stderr", type: "text/plain", buffer: "System err\n" },
  ]);
});
