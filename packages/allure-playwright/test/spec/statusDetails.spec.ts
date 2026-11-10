import { Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { getStatusDetails } from "../../src/utils.js";
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
  const { message, trace } = tests[0].statusDetails;
  expect(message).toMatch(/first soft failure[\s\S]*repeated soft failure[\s\S]*repeated soft failure/);
  expect(message?.match(/first soft failure/g)).toHaveLength(1);
  expect(message?.match(/repeated soft failure/g)).toHaveLength(2);
  expect(trace).toMatch(
    /^Error: first soft failure[\s\S]*^Error: repeated soft failure[\s\S]*^Error: repeated soft failure/m,
  );
  expect(trace?.match(/^Error: first soft failure/gm)).toHaveLength(1);
  expect(trace?.match(/^Error: repeated soft failure/gm)).toHaveLength(2);
  expect(trace?.match(/^[ \t]*> \d+ \|/gm)).toHaveLength(3);
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
          delete result.errors[0].snippet;
          result.errors[0].stack = 'first stack';
          result.errors[1].message = 'second message';
          delete result.errors[1].stack;
          delete result.errors[1].snippet;
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

  expect(tests).toHaveLength(1);
  expect(tests[0].statusDetails?.trace).toMatch(/\s+at .*sample.test.js:5:/);
  expect(tests[0].statusDetails?.trace).not.toContain("\u001b[");

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        statusDetails: expect.objectContaining({
          message: expect.stringContaining("Object.is equality"),
          trace: expect.stringContaining("> 5 |         expect(true).toBe(false);"),
        }),
      }),
    ]),
  );
});

it("reports source-mapped snippets for errors in helper steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "helper.ts": `
      import { expect, test } from '@playwright/test';

      export const check = async (actual: boolean) => {
        await test.step('check in helper', async () => {
          expect(actual).toBe(true);
        });
      };
    `,
    "sample.test.ts": `
      import { test } from '@playwright/test';
      import { check } from './helper';

      test('fails in helper', async () => {
        await check(false);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const result = tests[0];
  const helperStep = result.steps.find((step) => step.name === "check in helper");
  const expectStep = helperStep?.steps.find((step) => step.name?.startsWith("Expect"));

  for (const item of [result, helperStep, expectStep]) {
    expect(item).toEqual(expect.objectContaining({ status: Status.FAILED }));
    expect(item?.statusDetails?.trace).toContain("> 6 |           expect(actual).toBe(true);");
    expect(item?.statusDetails?.trace).toMatch(/\s+at .*helper.ts:6:/);
    expect(item?.statusDetails?.trace).not.toContain("\u001b[");
  }
});

it("reports snippets for hook failures in test, step, and global error details", async () => {
  const { tests, globals } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from '@playwright/test';

      test.beforeEach(() => {
        throw new Error('hook failure');
      });
      test('blocked by hook', async () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  const result = tests[0];
  const hook = result.steps
    .find((step) => step.name === "Before Hooks")
    ?.steps.find((step) => step.name === "beforeEach hook");
  const errors = Object.values(globals ?? {}).flatMap((info) => info.errors);
  expect(errors).toHaveLength(1);
  expect(errors[0].status).toBe(Status.BROKEN);

  for (const details of [result.statusDetails, hook?.statusDetails, errors[0]]) {
    expect(details?.trace).toContain("> 5 |         throw new Error('hook failure');");
    expect(details?.trace).toMatch(/\s+at .*sample.test.ts:5:/);
  }
});

it.each([
  { stack: "Error: boom\n    at test.js:1:1", snippet: undefined, trace: "Error: boom\n    at test.js:1:1" },
  { stack: "Error: boom\n    at test.js:1:1", snippet: "", trace: "Error: boom\n    at test.js:1:1" },
  { stack: undefined, snippet: "> 1 | fail()\n    | ^", trace: "> 1 | fail()\n    | ^" },
  { stack: undefined, snippet: undefined, trace: undefined },
  {
    stack: "\u001b[31mError: boom\u001b[39m",
    snippet: "\u001b[31m> 1 | fail()\u001b[39m",
    trace: "> 1 | fail()\n\nError: boom",
  },
])("preserves available error details: %j", ({ stack, snippet, trace }) => {
  const error = Object.freeze({ message: "Error: boom", stack, snippet });
  expect(getStatusDetails(error)).toEqual({ message: "Error: boom", trace });
});
