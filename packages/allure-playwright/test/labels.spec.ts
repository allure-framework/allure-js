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
import { LabelName } from "allure-js-commons";

test("should report structure a.test.ts", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      test.describe('suite', () => {
        test('should work', async ({}) => {});
      });`,
    reporterOptions: JSON.stringify({
      suiteTitle: true,
    }),
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        {
          name: LabelName.LANGUAGE,
          value: "JavaScript",
        },
        {
          name: LabelName.FRAMEWORK,
          value: "Playwright",
        },
        {
          name: LabelName.PARENT_SUITE,
          value: "project",
        },
        {
          name: LabelName.SUITE,
          value: "a.test.ts",
        },
        {
          name: LabelName.SUB_SUITE,
          value: "suite",
        },
      ]),
    }),
  ]);
});

test("should report structure b.test.ts", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "b.test.ts": `
      import test from '@playwright/test';
      test.describe('parent suite 2', () => {
        test.describe('suite 2', () => {
          test.describe('sub suite 2', () => {
            test('should work 2', async ({}) => {});
          });
        });
      });
    `,
    reporterOptions: JSON.stringify({
      suiteTitle: true,
    }),
  });

  expect(results.tests).toEqual([
    expect.objectContaining({
      labels: expect.arrayContaining([
        {
          name: LabelName.LANGUAGE,
          value: "JavaScript",
        },
        {
          name: LabelName.FRAMEWORK,
          value: "Playwright",
        },
        {
          name: LabelName.PARENT_SUITE,
          value: "project",
        },
        {
          name: LabelName.SUITE,
          value: "b.test.ts",
        },
        {
          name: LabelName.SUB_SUITE,
          value: "parent suite 2 > suite 2 > sub suite 2",
        },
      ]),
    }),
  ]);
});
