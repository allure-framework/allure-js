import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils";

it("reports programmatically skipped results", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test.skip('should be skipped 1', async () => {});

      test('should not be skipped', async () => {});
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fullName: "sample.test.js:4:12",
        status: Status.SKIPPED,
      }),
      expect.objectContaining({
        fullName: "sample.test.js:6:11",
        status: Status.PASSED,
      }),
    ]),
  );
});
