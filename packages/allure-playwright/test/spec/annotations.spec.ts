import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should support skip annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test full report', {
        annotation: {
          type: "skip",
          description: "skipped via skip annotation",
        },
      }, async () => {
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test full report",
        status: "skipped",
        statusDetails: expect.objectContaining({
          message: "skipped via skip annotation",
        }),
      }),
    ]),
  );
});

it("should support fixme annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test full report', {
        annotation: {
          type: "fixme",
          description: "skipped via fixme annotation",
        },
      }, async () => {
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test full report",
        status: "skipped",
        statusDetails: expect.objectContaining({
          message: "skipped via fixme annotation",
        }),
      }),
    ]),
  );
});
