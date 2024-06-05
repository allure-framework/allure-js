import { describe, expect, it } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runPlaywrightInlineTest } from "../utils.js";

describe("testplan with v1 reporter full names", () => {
  it("respects testplan", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 1,
          selector: "nested/super strange nested/super strange name.test.ts#also nested should execute",
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
          selector: "notaga.test.ts#a",
        },
      ],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
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
        test('selected name @allure.id=5', async ({}, testInfo) => {
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
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests.map((value) => value.fullName)).toEqual(
      expect.arrayContaining([
        "b.test.ts:3:13",
        "nested/super strange nested/super strange name.test.ts:4:14",
        ".+.test.ts:3:13",
        "notaga.test.ts:3:13",
      ]),
    );
  });
});

describe("testplan with v2 reporter full names", () => {
  it("respects testplan", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 1,
          selector: "nested/super strange nested/super strange name.test.ts:4:14",
        },
        {
          id: 2,
          selector: "b.test.ts:3:13",
        },
        {
          id: 3,
          // Wierd Regexp selector that should be escaped and match only one test
          selector: ".+.test.ts:3:13",
        },
        {
          id: 4,
          selector: "aga.test.ts:3:13",
        },
      ],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
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
        test('selected name @allure.id=5', async ({}, testInfo) => {
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
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests.map((value) => value.fullName)).toEqual(
      expect.arrayContaining([
        "b.test.ts:3:13",
        "nested/super strange nested/super strange name.test.ts:4:14",
        ".+.test.ts:3:13",
        "aga.test.ts:3:13",
      ]),
    );
  });
});
