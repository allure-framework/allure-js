import type { TestPlanV1 } from "allure-js-commons/sdk";
import { describe, expect, it } from "vitest";

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

describe("testplan with id fallback", () => {
  it("supports id-only testplan entries", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 5 }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('should not execute', async () => {
          expect(1).toBe(1);
        });
        test('selected name @allure.id=5', async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );
    expect(results.tests).toHaveLength(1);
    expect(results.tests).toEqual([
      expect.objectContaining({
        name: "selected name",
        fullName: "a.test.ts:6:13",
      }),
    ]);
  });

  it("supports annotation-based ids", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 5 }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('should not execute', async () => {
          expect(1).toBe(1);
        });
        test('selected name', {
          annotation: { type: "@allure.id", description: "5" },
        }, async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toHaveLength(1);
    expect(results.tests).toEqual([
      expect.objectContaining({
        name: "selected name",
        fullName: "a.test.ts:6:13",
      }),
    ]);
  });

  it("falls back to id when selector is stale", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 5, selector: "a.test.ts:999:1" }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('should not execute', async () => {
          expect(1).toBe(1);
        });
        test('selected name @allure.id=5', async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toHaveLength(1);
    expect(results.tests).toEqual([
      expect.objectContaining({
        name: "selected name",
        fullName: "a.test.ts:6:13",
      }),
    ]);
  });

  it("still matches by selector when id does not match", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 99, selector: "a.test.ts:3:13" }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('selected name @allure.id=5', async () => {
          expect(1).toBe(1);
        });
        test('should not execute', async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toHaveLength(1);
    expect(results.tests).toEqual([
      expect.objectContaining({
        name: "selected name",
        fullName: "a.test.ts:3:13",
      }),
    ]);
  });

  it("supports mixed selector and id entries", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ selector: "a.test.ts:3:13" }, { id: 6 }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('selected by selector', async () => {
          expect(1).toBe(1);
        });
        test('selected by id @allure.id=6', async () => {
          expect(1).toBe(1);
        });
        test('should not execute', async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toHaveLength(2);
    expect(results.tests).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "selected by selector",
          fullName: "a.test.ts:3:13",
        }),
        expect.objectContaining({
          name: "selected by id",
          fullName: "a.test.ts:6:13",
        }),
      ]),
    );
  });

  it("excludes tests that match neither selector nor id", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 7, selector: "a.test.ts:999:1" }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        test('selected by selector', async () => {
          expect(1).toBe(1);
        });
        test('selected by id', async () => {
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toEqual([]);
  });

  it("does not match runtime-only allure ids", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ id: 5 }],
    };
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify(exampleTestPlan),
        "a.test.ts": /* ts */ `
        import { test, expect } from '@playwright/test';
        import { allureId } from 'allure-js-commons';

        test('should not execute', async () => {
          await allureId('5');
          expect(1).toBe(1);
        });
      `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests).toEqual([]);
  });
});
