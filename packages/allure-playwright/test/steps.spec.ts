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

import { StepResult, TestResult } from "allure-js-commons";
import { test, expect } from "./fixtures";

test("should report test status", async ({ runInlineTest }) => {
  const result = await runInlineTest(
    {
      "a.test.ts": `
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
    },
    (writer) => {
      const convert = (test: StepResult | TestResult) => {
        return {
          name: test.name,
          children: test.steps.map(convert),
        };
      };
      return convert(writer.tests[0]);
    },
  );
  expect(result).toEqual({
    name: "should pass",
    children: [
      { name: "Before Hooks", children: [] },
      {
        name: "outer step 1",
        children: [
          { name: "inner step 1.1", children: [] },
          { name: "inner step 1.2", children: [] },
        ],
      },
      {
        name: "outer step 2",
        children: [
          { name: "inner step 2.1", children: [] },
          { name: "inner step 2.2", children: [] },
        ],
      },
      { name: "After Hooks", children: [] },
    ],
  });
});
