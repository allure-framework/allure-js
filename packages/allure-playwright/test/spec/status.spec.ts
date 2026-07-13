import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

const getTestsByName = (tests: Awaited<ReturnType<typeof runPlaywrightInlineTest>>["tests"], name: string) => {
  return tests.filter((test) => test.name === name);
};

it("reports test status", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      test('should pass', async ({}) => {
      });

      test('should fail', async ({}) => {
        expect(true).toBe(false);
      });

      test('should break', async ({}) => {
        test.setTimeout(1);
        await new Promise(() => {});
      });

      test('should skip', async ({}) => {
        test.skip(true);
      });

      test('should fixme', async ({}) => {
        test.fixme(true);
      });

      test('should expect fail', async ({}) => {
        test.fail(true);
        expect(true).toBe(false);
      });
    `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ name: "should pass", status: Status.PASSED, stage: Stage.FINISHED }),
      expect.objectContaining({ name: "should fail", status: Status.FAILED, stage: Stage.FINISHED }),
      expect.objectContaining({ name: "should break", status: Status.BROKEN, stage: Stage.FINISHED }),
      expect.objectContaining({ name: "should skip", status: Status.SKIPPED, stage: Stage.FINISHED }),
      expect.objectContaining({
        name: "should fixme",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "should expect fail",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});

it("reports retry attempts with an excluded Retry parameter", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": `
        import { test, expect } from '@playwright/test';

        test('should pass on retry', async ({}, testInfo) => {
          expect(testInfo.retry).toBeGreaterThan(0);
        });

        test('should pass without retry', async ({}) => {
        });
      `,
    },
    ["--retries=1"],
  );

  const retryResults = getTestsByName(tests, "should pass on retry");
  const failedAttempt = retryResults.find((test) => test.status === Status.FAILED);
  const passedAttempt = retryResults.find((test) => test.status === Status.PASSED);
  const stableResults = getTestsByName(tests, "should pass without retry");

  expect(retryResults).toHaveLength(2);
  expect(stableResults).toHaveLength(1);
  expect(failedAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      parameters: expect.not.arrayContaining([expect.objectContaining({ name: "Retry" })]),
    }),
  );
  expect(failedAttempt).not.toHaveProperty("flaky");
  expect(failedAttempt).not.toHaveProperty("retriesCount");
  expect(passedAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      parameters: expect.arrayContaining([expect.objectContaining({ name: "Retry", value: "1", excluded: true })]),
    }),
  );
  expect(passedAttempt).not.toHaveProperty("flaky");
  expect(passedAttempt).not.toHaveProperty("retriesCount");
  expect(stableResults[0]).not.toHaveProperty("flaky");
  expect(stableResults[0]).not.toHaveProperty("retriesCount");
});

it("doesn't mark expected failures retried into their expected status as flaky", async () => {
  const { tests } = await runPlaywrightInlineTest(
    {
      "sample.test.js": `
        import { test, expect } from '@playwright/test';

        test('expected failure should pass on retry', async ({}, testInfo) => {
          test.fail(true);

          if (testInfo.retry === 0) {
            return;
          }

          expect(true).toBe(false);
        });
      `,
    },
    ["--retries=1"],
  );

  const retryResults = getTestsByName(tests, "expected failure should pass on retry");
  const unexpectedPassAttempt = retryResults.find((test) => test.status === Status.FAILED);
  const expectedFailureAttempt = retryResults.find((test) => test.status === Status.PASSED);

  expect(retryResults).toHaveLength(2);
  expect(unexpectedPassAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      status: Status.FAILED,
      parameters: expect.not.arrayContaining([expect.objectContaining({ name: "Retry" })]),
    }),
  );
  expect(unexpectedPassAttempt).not.toHaveProperty("flaky");
  expect(unexpectedPassAttempt).not.toHaveProperty("retriesCount");
  expect(expectedFailureAttempt).toEqual(
    expect.objectContaining({
      stage: Stage.FINISHED,
      parameters: expect.arrayContaining([expect.objectContaining({ name: "Retry", value: "1", excluded: true })]),
    }),
  );
  expect(expectedFailureAttempt).not.toHaveProperty("flaky");
  expect(expectedFailureAttempt).not.toHaveProperty("retriesCount");
});
