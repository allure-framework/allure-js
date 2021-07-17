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

test("should report structure", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
      import test from '@playwright/test';
      test.describe('suite', () => {
        test('should work', async ({}) => {});
      });`,
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
    },
    (writer) => {
      return writer.tests.map((t) => ({
        name: t.name,
        fullName: t.fullName,
        historyId: t.historyId,
        labels: t.labels,
      }));
    },
  );
  expect(result).toEqual([
    {
      name: "should work",
      fullName: "should work",
      historyId: "project a.test.ts suite should work",
      labels: [
        {
          name: "language",
          value: "JavaScript",
        },
        {
          name: "framework",
          value: "Playwright",
        },
        {
          name: "parentSuite",
          value: "project",
        },
        {
          name: "suite",
          value: "a.test.ts",
        },
        {
          name: "subSuite",
          value: "suite",
        },
      ],
    },
    {
      name: "should work 2",
      fullName: "should work 2",
      historyId: "project b.test.ts parent suite 2 suite 2 sub suite 2 should work 2",
      labels: [
        {
          name: "language",
          value: "JavaScript",
        },
        {
          name: "framework",
          value: "Playwright",
        },
        {
          name: "parentSuite",
          value: "project",
        },
        {
          name: "suite",
          value: "b.test.ts",
        },
        {
          name: "subSuite",
          value: "parent suite 2 > suite 2 > sub suite 2",
        },
      ],
    },
  ]);
});
