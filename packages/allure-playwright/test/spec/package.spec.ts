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
