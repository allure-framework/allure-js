import { LabelName } from "allure-js-commons";
import { expect, test } from "./fixtures";

test("should report tests even if global setup fails", async ({ runInlineTest }) => {
  const results = await runInlineTest({
    "a.test.ts": /* ts */ `
      import test from '@playwright/test';
      test('should be skipped 1', async () => {});
    `,
    "b.test.ts": /* ts */ `
      import test from '@playwright/test';
      test('should be skipped 2', async () => {});
    `,
    "global-fail.ts": /* ts */ `
      export default function throwingScript() {
        throw new Error("test");
      }
    `,
    "playwright.config.ts": `
        module.exports = {
          projects: [{ name: 'project' }],
          reporter: [[require.resolve("../../dist/index.js")]],
          globalSetup: "./global-fail.ts"
       };
      `,
  });

  expect(results.tests).toEqual(
    [
      expect.objectContaining({
        fullName: "a.test.ts#should be skipped 1",
        status: "skipped",
        labels: expect.arrayContaining([{ name: LabelName.ALLURE_ID, value: "-1" }]),
        statusDetails: expect.objectContaining({
          message:
            "This test was skipped due to test setup error. Check you setup scripts to fix the issue.",
        }),
      }),
      expect.objectContaining({
        fullName: "b.test.ts#should be skipped 2",
        status: "skipped",
        statusDetails: expect.objectContaining({
          message:
            "This test was skipped due to test setup error. Check you setup scripts to fix the issue.",
        }),
        labels: expect.arrayContaining([{ name: LabelName.ALLURE_ID, value: "-1" }]),
      }),
    ]
  );
});
