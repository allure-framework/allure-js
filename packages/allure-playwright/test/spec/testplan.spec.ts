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
          // A selector with special regexp characters should match exactly one test.
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
         (await import('node:fs')).writeFileSync('v1-not-selected-ran.txt', 'yes'); expect(1).toBe(1);
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
        "b.test.ts › should execute",
        "nested/super strange nested/super strange name.test.ts › also nested › should execute",
        ".+.test.ts › +.",
        "notaga.test.ts › a",
      ]),
    );
    expect(results.restFiles["v1-not-selected-ran.txt"]).toBeUndefined();
  });
});

describe("testplan with stable Playwright selectors", () => {
  it("respects testplan", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [
        {
          id: 1,
          selector: "nested/super strange nested/super strange name.test.ts › also nested › should execute",
        },
        {
          id: 2,
          selector: "b.test.ts › should execute",
        },
        {
          id: 3,
          selector: ".+.test.ts › +.",
        },
        {
          id: 4,
          selector: "aga.test.ts › a",
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
         (await import('node:fs')).writeFileSync('v2-not-selected-ran.txt', 'yes'); expect(1).toBe(1);
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
        "b.test.ts › should execute",
        "nested/super strange nested/super strange name.test.ts › also nested › should execute",
        ".+.test.ts › +.",
        "aga.test.ts › a",
      ]),
    );
    expect(results.restFiles["v2-not-selected-ran.txt"]).toBeUndefined();
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
          (await import('node:fs')).writeFileSync('not-selected-ran.txt', 'yes'); expect(1).toBe(1);
        });
        test('selected name @allure.id=5', async () => {
          (await import('node:fs')).writeFileSync('selected-ran.txt', 'yes'); expect(1).toBe(1);
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
        fullName: "a.test.ts › selected name @allure.id=5",
      }),
    ]);
    expect(results.restFiles["selected-ran.txt"]).toBe("yes");
    expect(results.restFiles["not-selected-ran.txt"]).toBeUndefined();
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
          (await import('node:fs')).writeFileSync('annotation-not-selected-ran.txt', 'yes'); expect(1).toBe(1);
        });
        test('selected name', {
          annotation: { type: "@allure.id", description: "5" },
        }, async () => {
          (await import('node:fs')).writeFileSync('annotation-selected-ran.txt', 'yes'); expect(1).toBe(1);
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
        fullName: "a.test.ts › selected name",
      }),
    ]);
    expect(results.restFiles["annotation-selected-ran.txt"]).toBe("yes");
    expect(results.restFiles["annotation-not-selected-ran.txt"]).toBeUndefined();
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
        fullName: "a.test.ts › selected name @allure.id=5",
      }),
    ]);
  });

  it("still matches by the old location selector when id does not match", async () => {
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
        fullName: "a.test.ts › selected name @allure.id=5",
      }),
    ]);
  });

  it("supports mixed selector and id entries", async () => {
    const exampleTestPlan: TestPlanV1 = {
      version: "1.0",
      tests: [{ selector: "a.test.ts › selected by selector" }, { id: 6 }],
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
          fullName: "a.test.ts › selected by selector",
        }),
        expect.objectContaining({
          name: "selected by id",
          fullName: "a.test.ts › selected by id @allure.id=6",
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
        test.beforeAll(async () => {
          (await import('node:fs')).writeFileSync('not-selected-before-all-ran.txt', 'yes');
        });
        test('selected by selector', async () => {
          (await import('node:fs')).writeFileSync('not-selected-by-selector-ran.txt', 'yes');
          expect(1).toBe(1);
        });
        test('selected by id', async () => {
          (await import('node:fs')).writeFileSync('not-selected-by-id-ran.txt', 'yes');
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
    expect(results.restFiles["not-selected-before-all-ran.txt"]).toBeUndefined();
    expect(results.restFiles["not-selected-by-selector-ran.txt"]).toBeUndefined();
    expect(results.restFiles["not-selected-by-id-ran.txt"]).toBeUndefined();
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

describe("testplan with project dependencies", () => {
  it("does not filter readonly setup and teardown projects", async () => {
    const testPlanFilename = "example-testplan.json";
    const results = await runPlaywrightInlineTest(
      {
        [testPlanFilename]: JSON.stringify({
          version: "1.0",
          tests: [{ selector: "main.test.ts › selected" }],
        } satisfies TestPlanV1),
        "playwright.config.js": /* js */ `
          module.exports = {
            reporter: [["allure-playwright", { resultsDir: "./allure-results" }]],
            projects: [
              { name: "setup", testMatch: /setup\\.test\\.ts/, teardown: "teardown" },
              { name: "teardown", testMatch: /teardown\\.test\\.ts/ },
              { name: "main", testMatch: /main\\.test\\.ts/, dependencies: ["setup"] },
            ],
          };
        `,
        "setup.test.ts": /* ts */ `
          import { test } from '@playwright/test';
          test('setup', async () => {});
        `,
        "teardown.test.ts": /* ts */ `
          import { test } from '@playwright/test';
          test('teardown', async () => {});
        `,
        "main.test.ts": /* ts */ `
          import { test } from '@playwright/test';
          test('selected', async () => {});
          test('not selected', async () => {});
        `,
      },
      [],
      {
        ALLURE_TESTPLAN_PATH: testPlanFilename,
      },
    );

    expect(results.tests.map(({ name }) => name)).toEqual(expect.arrayContaining(["setup", "selected", "teardown"]));
    expect(results.tests.find(({ name }) => name === "not selected")).toBeUndefined();
  });
});
