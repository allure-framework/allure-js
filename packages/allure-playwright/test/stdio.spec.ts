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

test("should report stdout and stderr", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import test from '@playwright/test';
        test("Demo test", async () => {
          console.log("Test log");
          console.error('System err 1');
          console.log("Test log 2");
          console.error('System err 2');
          await test.step("nested", async () => {
            console.log("Test nested log");
            console.error('System err 3');
          });
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
    { name: "stdout", type: "text/plain", buffer: "Test log\nTest log 2\nTest nested log\n" },
    { name: "stderr", type: "text/plain", buffer: "System err 1\nSystem err 2\nSystem err 3\n" },
  ]);
});
