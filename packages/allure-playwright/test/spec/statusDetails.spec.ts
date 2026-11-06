import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it("reports soft assertion failures in order, including identical failures", async () => {
  const { tests, globals } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('multiple failures', () => {
        expect.soft('first', 'first soft failure').toBe('false1');
        for (let i = 0; i < 2; i++) expect.soft('actual', 'repeated soft failure').toBe('expected');
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  for (const value of [tests[0].statusDetails.message, tests[0].statusDetails.trace]) {
    expect(value).toMatch(/first soft failure[\s\S]*repeated soft failure[\s\S]*repeated soft failure/);
    expect(value?.match(/first soft failure/g)).toHaveLength(1);
    expect(value?.match(/repeated soft failure/g)).toHaveLength(2);
  }
  expect(Object.values(globals ?? {}).flatMap(({ errors }) => errors)).toEqual([]);
});

it("reports a soft assertion followed by a thrown error", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('mixed failures', () => {
        expect.soft('actual', 'soft failure').toBe('expected');
        throw new Error('later thrown failure');
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  for (const value of [tests[0].statusDetails.message, tests[0].statusDetails.trace]) {
    expect(value).toMatch(/soft failure[\s\S]*later thrown failure/);
  }
});

it("preserves the first comparison's metadata and skips missing messages and stacks", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('sparse error details', () => {
        expect.soft(1).toBe(2);
        expect.soft(3).toBe(4);
      });
    `,
    // Enrich the native error carrier before Allure receives it. Playwright itself
    // currently strips assertion comparison metadata during error transport.
    "enrich-errors.cjs": `
      module.exports = class {
        onTestEnd(test, result) {
          result.errors[0].matcherResult = { actual: 'first actual', expected: 'first expected' };
          result.errors[1].matcherResult = { actual: 'second actual', expected: 'second expected' };
          delete result.errors[0].message;
          result.errors[0].stack = 'first stack';
          result.errors[1].message = 'second message';
          delete result.errors[1].stack;
        }
      };
    `,
    "playwright.config.js": `
      module.exports = {
        reporter: [['./enrich-errors.cjs'], ['allure-playwright', { resultsDir: './allure-results' }]],
      };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].statusDetails).toEqual({
    message: "second message",
    trace: "first stack",
    actual: "first actual",
    expected: "first expected",
  });
});

it("reports test status details", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Object.is equality"),
          trace: expect.stringMatching(/\s*at\s/),
        }),
      }),
    ]),
  );
});
