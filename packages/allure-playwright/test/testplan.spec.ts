import { TestPlanFile } from "../src/testplan";
import { expect, test } from "./fixtures";

test("should respect testplan", async ({ runInlineTest }) => {
  const exampleTestPlan: TestPlanFile = {
    version: "1.0",
    tests: [
      {
        id: 1,
        selector:
          "nested/super strange nested/super strange name.test.ts#also nested should execute",
      },
      {
        id: 2,
        selector: "b.test.ts#should execute",
      },
      {
        id: 3,
        // Wierd Regexp selector that should be escaped and match only one test
        selector: ".+.test.ts#+.",
      },
      {
        id: 4,
        selector: "aga.test.ts#a",
      },
    ],
  };
  const testPlanFilename = "example-testplan.json";
  const results = await runInlineTest(
    {
      [testPlanFilename]: JSON.stringify(exampleTestPlan),
      "a.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test('should not execute', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
     `,
      "b.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test('should execute', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
     `,
      "nested/super strange nested/super strange name.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test.describe('also nested', () => {
        test('should execute', async ({}, testInfo) => {
       });
      });
     `,
      ".+.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test('+.', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
     `,
      "aga.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test('a', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
       test('aa', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
     `,
      "notaga.test.ts": /* ts */ `
       import { test, expect } from '@playwright/test';
       test('a', async ({}, testInfo) => {
        expect(1).toBe(1);
       });
     `,
    },
    (writer) => {
      return writer.tests.map((val) => val.fullName);
    },
    {},
    {
      ALLURE_TESTPLAN_PATH: testPlanFilename,
    },
  );

  expect(results.length).toBe(4);

  expect(results).toEqual(
    expect.arrayContaining([
      "b.test.ts#should execute",
      ".+.test.ts#+.",
      "nested/super strange nested/super strange name.test.ts#also nested should execute",
      "aga.test.ts#a",
    ]),
  );
});
