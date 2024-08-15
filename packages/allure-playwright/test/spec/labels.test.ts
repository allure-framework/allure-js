import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should add host & thread labels", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "nested/sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 1', async ({}, testInfo) => {});
      });
      `,
    "nested/more/sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 2', async ({}, testInfo) => {});
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        labels: expect.arrayContaining([
          {
            name: "host",
            value: expect.any(String),
          },
          {
            name: "thread",
            value: expect.any(String),
          },
        ]),
      }),
      expect.objectContaining({
        name: "test 2",
        labels: expect.arrayContaining([
          {
            name: "host",
            value: expect.any(String),
          },
          {
            name: "thread",
            value: expect.any(String),
          },
        ]),
      }),
    ]),
  );
});

it("should add package label", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "nested/sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 1', async ({}, testInfo) => {});
      });
      `,
    "nested/more/sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test 2', async ({}, testInfo) => {});
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test 1",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.sample.test.js",
          },
        ]),
      }),
      expect.objectContaining({
        name: "test 2",
        labels: expect.arrayContaining([
          {
            name: "package",
            value: "nested.more.sample.test.js",
          },
        ]),
      }),
    ]),
  );
});

it("should add labels from env variables", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {});
      });
      `,
    },
    undefined,
    {
      ALLURE_LABEL_A: "a",
      ALLURE_LABEL_B: "b",
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
