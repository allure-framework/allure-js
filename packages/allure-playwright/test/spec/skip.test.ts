import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports programmatically skipped results", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "package.json": JSON.stringify({ name: "dummy" }),
    "sample.test.js": `
      import test from '@playwright/test';

      test.skip('should be skipped 1', async () => {});

      test('should not be skipped', async () => {});

      test('should be skipped 2', async () => {
        test.skip(true, "runtime skip");
      });
    `,
  });

  const skipped1 = tests.find((test) => test.name === "should be skipped 1")!;
  const notSkipped = tests.find((test) => test.name === "should not be skipped")!;
  const skipped2 = tests.find((test) => test.name === "should be skipped 2")!;
  const skipped1TestCaseId = md5("dummy:sample.test.js#should be skipped 1");
  const notSkippedTestCaseId = md5("dummy:sample.test.js#should not be skipped");
  const skipped2TestCaseId = md5("dummy:sample.test.js#should be skipped 2");

  expect(skipped1).toEqual(
    expect.objectContaining({
      fullName: "sample.test.js:4:12",
      status: Status.SKIPPED,
      testCaseId: skipped1TestCaseId,
    }),
  );
  expect(notSkipped).toEqual(
    expect.objectContaining({
      fullName: "sample.test.js:6:11",
      status: Status.PASSED,
      testCaseId: notSkippedTestCaseId,
    }),
  );
  expect(skipped2).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      testCaseId: skipped2TestCaseId,
      statusDetails: expect.objectContaining({
        message: "runtime skip",
      }),
    }),
  );

  expect(skipped1.historyId).toBe(`${skipped1TestCaseId}:4d32f1bb70ce8096643fc1cc311d1fe1`);
  expect(notSkipped.historyId).toBe(`${notSkippedTestCaseId}:4d32f1bb70ce8096643fc1cc311d1fe1`);
  expect(skipped2.historyId).toBe(`${skipped2TestCaseId}:4d32f1bb70ce8096643fc1cc311d1fe1`);

  expect(skipped1.labels).toEqual(
    expect.arrayContaining([{ name: "_fallbackTestCaseId", value: md5("sample.test.js#should be skipped 1") }]),
  );
  expect(notSkipped.labels).toEqual(
    expect.arrayContaining([{ name: "_fallbackTestCaseId", value: md5("sample.test.js#should not be skipped") }]),
  );
  expect(skipped2.labels).toEqual(
    expect.arrayContaining([{ name: "_fallbackTestCaseId", value: md5("sample.test.js#should be skipped 2") }]),
  );
});
