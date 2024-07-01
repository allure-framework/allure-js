import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should support playwright tags", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test full report', {
        tag: ['@slow', '@vrt'],
      }, async () => {
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test full report",
        labels: expect.arrayContaining([
          {
            name: "tag",
            value: "slow",
          },
          {
            name: "tag",
            value: "vrt",
          },
        ]),
      }),
    ]),
  );
});

it("should support tests with single tag", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test("test single tag report", { tag: "@single"}, async() => {});
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test single tag report",
        labels: expect.arrayContaining([
          {
            name: "tag",
            value: "single",
          },
        ]),
      }),
    ]),
  );
});

it("should support suites tags", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('suite', { tag: "@first"}, () => {
        test("test single tag report", { tag: "@second"}, async() => {});
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test single tag report",
        labels: expect.arrayContaining([
          {
            name: "tag",
            value: "first",
          },
          {
            name: "tag",
            value: "second",
          },
        ]),
      }),
    ]),
  );
});
