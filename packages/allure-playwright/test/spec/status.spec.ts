import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

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
