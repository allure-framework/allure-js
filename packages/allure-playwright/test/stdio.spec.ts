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

test("should report stdout", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
        test("Demo test", async () => {
          console.log("Test log");
          console.error('System err 1');
          console.log("Test log 2");
          console.error('System err 2');
          console.log({ "foo": 'bar' });
          console.log([1, 2, 3, "test"]);
          console.error({ foo: 'bar' });
          console.error([1, 2, 3, "test"]);
          await test.step("nested", async () => {
            console.log("Test nested log");
            console.error('System err 3');
          });
        });
    `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "stdout",
          type: "text/plain",
          source: expect.stringMatching(/^.*-attachment\.txt$/),
        }),
      ]),
    }),
  ]);

  const stdout = results.tests[0].attachments.find((a) => a.name === "stdout");
  expect(results.attachments[stdout!.source]).toEqual(
    Buffer.from(
      "Test log\nTest log 2\n{ foo: 'bar' }\n[ 1, 2, 3, 'test' ]\nTest nested log\n",
    ).toString("base64"),
  );
});

test("should report stderr", async ({ runInlineTest }) => {
  test.skip(true, "stderr is not reported by playwright for some reason");
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
        test("Demo test", async () => {
          console.log("Test log");
          console.error('System err 1');
          console.log("Test log 2");
          console.error('System err 2');
          console.log({ "foo": 'bar' });
          console.log([1, 2, 3, "test"]);
          console.error({ foo: 'bar' });
          console.error([1, 2, 3, "test"]);
          await test.step("nested", async () => {
            console.log("Test nested log");
            console.error('System err 3');
          });
        });
    `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "stderr",
          type: "text/plain",
          source: expect.stringMatching(/^.*-attachment\.txt$/),
        }),
      ]),
    }),
  ]);

  const stderr = results.tests[0].attachments.find((a) => a.name === "stderr");
  expect(results.attachments[stderr!.source]).toEqual(
    Buffer.from(
      "System err 1\nSystem err 2\n{ foo: 'bar' }\n[ 1, 2, 3, 'test' ]\nSystem err 3\n",
    ).toString("base64"),
  );
});
