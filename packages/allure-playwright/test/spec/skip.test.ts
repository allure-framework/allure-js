import { Stage, Status } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

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

it("reports steps of a test skipped in a hook as skipped", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test.describe('suite', () => {
        test.beforeEach(async () => {
          test.skip(true, "skipped in the hook");
        });

        test('should be skipped', async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "should be skipped",
      status: Status.SKIPPED,
      statusDetails: expect.objectContaining({
        message: "skipped in the hook",
      }),
    }),
  );

  const beforeHooks = tests[0].steps.find((step) => step.name === "Before Hooks")!;

  expect(beforeHooks).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "skipped in the hook",
      }),
      steps: [
        expect.objectContaining({
          name: "beforeEach hook",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "skipped in the hook",
          }),
        }),
      ],
    }),
  );
});

it("reports steps of a conditionally skipped test as skipped", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test.describe('suite', () => {
        test.skip(() => true, "skipped by condition");

        test('should be skipped', async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "should be skipped",
      status: Status.SKIPPED,
    }),
  );

  const beforeHooks = tests[0].steps.find((step) => step.name === "Before Hooks")!;

  expect(beforeHooks).toEqual(
    expect.objectContaining({
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "skipped by condition",
      }),
      steps: [
        expect.objectContaining({
          name: "skip modifier",
          status: Status.SKIPPED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: "skipped by condition",
          }),
        }),
      ],
    }),
  );
});

it("reports a step interrupted by a skip modifier as skipped", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should be skipped', async () => {
        await test.step('a step', async () => {
          test.skip(true, "skipped in the step");
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      name: "should be skipped",
      status: Status.SKIPPED,
    }),
  );
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "a step",
      status: Status.SKIPPED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: "skipped in the step",
      }),
    }),
  );
});

it("keeps steps of a failed test failed", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should fail in a step', async () => {
        await test.step('a step', async () => {
          throw new Error("something went wrong");
        });
      });

      test.describe('suite', () => {
        test.beforeEach(async () => {
          throw new Error("the hook went wrong");
        });

        test('should fail in a hook', async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(2);

  const failedInStep = tests.find((test) => test.name === "should fail in a step")!;
  const failedInHook = tests.find((test) => test.name === "should fail in a hook")!;

  expect(failedInStep.status).toBe(Status.FAILED);
  expect(failedInStep.steps).toContainEqual(
    expect.objectContaining({
      name: "a step",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("something went wrong"),
        trace: expect.stringContaining("something went wrong"),
      }),
    }),
  );

  expect(failedInHook.status).toBe(Status.FAILED);

  const beforeHooks = failedInHook.steps.find((step) => step.name === "Before Hooks")!;

  expect(beforeHooks).toEqual(
    expect.objectContaining({
      status: Status.FAILED,
      stage: Stage.FINISHED,
      statusDetails: expect.objectContaining({
        message: expect.stringContaining("the hook went wrong"),
      }),
      steps: [
        expect.objectContaining({
          name: "beforeEach hook",
          status: Status.FAILED,
          stage: Stage.FINISHED,
          statusDetails: expect.objectContaining({
            message: expect.stringContaining("the hook went wrong"),
          }),
        }),
      ],
    }),
  );
});
