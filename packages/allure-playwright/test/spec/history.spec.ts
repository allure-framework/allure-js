import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("historical data should be fine", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {});
      });
      `,
  });
  const fullName = "sample.test.js:5:13";

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test",
        fullName,
        testCaseId: "bf3198c05e4d7aaeeffe4ca4b5244d0f",
        historyId: "bf3198c05e4d7aaeeffe4ca4b5244d0f:4d32f1bb70ce8096643fc1cc311d1fe1",
      }),
    ]),
  );
});
