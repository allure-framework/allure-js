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

test("should have link", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import { test } from '@playwright/test';
      import { allure } from '../../dist/index'
      test('should add epic link', async ({}, testInfo) => {
          allure.link("https://playwright.dev/docs/api/class-page#page-workers");

          allure.links(...[{url:"https://www.google.com/1"}, {url:"https://www.google.com/2"}]);
      });
      `,
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      links: [
        {
          url: "https://playwright.dev/docs/api/class-page#page-workers",
        },
        {
          url: "https://www.google.com/1",
        },
        {
          url: "https://www.google.com/2",
        },
      ],
    }),
  ]);
});
