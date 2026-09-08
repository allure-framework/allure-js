import { createRequire } from "node:module";

import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

const require = createRequire(import.meta.url);

it("should not load @playwright/test when the reporter is loaded", () => {
  const moduleApi = require("node:module") as {
    _load: (request: string, parent: NodeJS.Module | null | undefined, isMain: boolean) => unknown;
  };
  const distIndexPath = require.resolve("../../dist/cjs/index.js");
  const originalLoad = moduleApi._load;

  delete require.cache[distIndexPath];

  moduleApi._load = (request, parent, isMain) => {
    if (request === "@playwright/test") {
      throw new Error("allure-playwright reporter must not load @playwright/test");
    }

    return originalLoad.call(moduleApi, request, parent, isMain);
  };

  try {
    const reporter = require(distIndexPath) as {
      AllureReporter: unknown;
      default: unknown;
    };

    expect(reporter.default).toBe(reporter.AllureReporter);
  } finally {
    moduleApi._load = originalLoad;
    delete require.cache[distIndexPath];
  }
});

it("should re-export the original Playwright functions", () => {
  const legacy = require("../../dist/cjs/index.js") as typeof import("../../src/index.js");
  const playwright = require("@playwright/test") as typeof import("@playwright/test");

  expect(legacy.test).toBe(playwright.test);
  expect(legacy.expect).toBe(playwright.expect);
});

it("should select a legacy test by its declaration file and line", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": [
        'import { test, expect } from "allure-playwright";',
        'test("selected", async () => { expect(1).toBe(1); });',
        'test("not selected", async () => {});',
      ].join("\n"),
    },
    ["sample.test.js:2"],
  );

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({ name: "selected", status: "passed" });
});

it("should set package label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "some/path/to/sample.test.js": `
      import { test } from '@playwright/test';

      test('test 1', async () => {});
      `,
    "some/other/to/some.test.js": `
      import { test } from '@playwright/test';

      test('test 2', async () => {});
      `,
    "root.test.js": `
      import { test } from '@playwright/test';

      test('test 3', async () => {});
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        labels: expect.arrayContaining([{ name: "package", value: "allure-playwright.some.path.to.sample.test.js" }]),
      }),
      expect.objectContaining({
        name: "test 2",
        labels: expect.arrayContaining([{ name: "package", value: "allure-playwright.some.other.to.some.test.js" }]),
      }),
      expect.objectContaining({
        name: "test 3",
        labels: expect.arrayContaining([{ name: "package", value: "allure-playwright.root.test.js" }]),
      }),
    ]),
  );
});
