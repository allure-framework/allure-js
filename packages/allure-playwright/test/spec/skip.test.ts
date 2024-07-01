import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports programmatically skipped results", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test.skip('should be skipped 1', async () => {});

      test('should not be skipped', async () => {});

      test('should be skipped 2', async () => {
        test.skip(true, "runtime skip");
      });
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        fullName: "sample.test.js:4:12",
        status: Status.SKIPPED,
        testCaseId: md5("sample.test.js#should be skipped 1"),
      }),
      expect.objectContaining({
        status: Status.SKIPPED,
        testCaseId: md5("sample.test.js#should be skipped 2"),
        statusDetails: expect.objectContaining({
          message: "runtime skip",
        }),
      }),
      expect.objectContaining({
        fullName: "sample.test.js:6:11",
        status: Status.PASSED,
        testCaseId: md5("sample.test.js#should not be skipped"),
      }),
    ]),
  );
});
