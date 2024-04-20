import md5 from "md5";
import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils";

it("historical data should be fine", async () => {
  const { tests } = await runPlaywrightInlineTest(
    `
      import { test } from '@playwright/test';

      test.describe('nested', () => {
        test('test', async ({}, testInfo) => {});
      });
      `,
  );
  const fullName = "sample.test.js#nested test";

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test",
        fullName: fullName,
        testCaseId: md5(fullName),
        historyId: md5(fullName) + ":" + md5("Project:project"),
      }),
    ]),
  );
});
