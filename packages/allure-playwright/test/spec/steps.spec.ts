import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports test steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.js": `
      import { test, expect } from '@playwright/test';

      test('should pass', async ({}) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
          });
          await test.step('inner step 2.2', async () => {
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual([
    expect.objectContaining({
      name: "should pass",
      status: Status.PASSED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: Status.PASSED, stage: Stage.FINISHED }),
            expect.objectContaining({ name: "inner step 1.2", status: Status.PASSED, stage: Stage.FINISHED }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({ name: "inner step 2.1", status: Status.PASSED, stage: Stage.FINISHED }),
            expect.objectContaining({ name: "inner step 2.2", status: Status.PASSED, stage: Stage.FINISHED }),
          ],
        }),
      ],
    }),
  ]);
});

it("reports failed test steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
      import { test, expect } from '@playwright/test';

      test('should pass', async ({}) => {
        await test.step('outer step 1', async () => {
          await test.step('inner step 1.1', async () => {
          });
          await test.step('inner step 1.2', async () => {
          });
        });
        await test.step('outer step 2', async () => {
          await test.step('inner step 2.1', async () => {
            expect(true).toBe(false);
          });
          await test.step('inner step 2.2', async () => {
          });
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual([
    expect.objectContaining({
      name: "should pass",
      status: Status.FAILED,
      stage: Stage.FINISHED,
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: Status.PASSED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: Status.PASSED, stage: Stage.FINISHED }),
            expect.objectContaining({ name: "inner step 1.2", status: Status.PASSED, stage: Stage.FINISHED }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: Status.FAILED,
          stage: Stage.FINISHED,
          steps: [
            expect.objectContaining({
              name: "inner step 2.1",
              status: Status.FAILED,
              stage: Stage.FINISHED,
              statusDetails: expect.objectContaining({
                message: expect.stringContaining("expect(received).toBe(expected)"),
                trace: expect.any(String),
              }),
            }),
          ],
        }),
      ],
    }),
  ]);
});

it("should support steps with names longer then 50 chars", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.js": `
      import { test, expect } from '@playwright/test';

      test('a test', async ({}) => {
        await test.step('Check email input field and submit button on password recovery window', async () => {
        });
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests).toEqual([
    expect.objectContaining({
      name: "a test",
      status: Status.PASSED,
      steps: [
        expect.objectContaining({
          name: "Check email input field and submit button on password recovery window",
          status: Status.PASSED,
        }),
      ],
    }),
  ]);
});

it("should ignore route.continue() steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.js": `
      import { test, expect } from '@playwright/test';

      test('a test', async ({ page }) => {
        await page.route('**/*', (route) => {
          route.continue();
        });
        await page.goto("https://allurereport.org");
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;
  expect(tr.steps).not.toContainEqual(
    expect.objectContaining({
      name: "route.continue()",
    }),
  );
});

it("should attach attachments to correct steps in hooks and test steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.js": `
      import { test, expect } from '@playwright/test';

      const example = async (some) => {
        await test.info().attach("test", { body: some });
      };

      test.describe("Scratch", () => {
        test.beforeAll(async () => {
          await example("test");
        });
        test("test", async () => {
          await test.step("test2", async () => {
            await example("test2");
          });
          await test.step("test3", async () => {
            await example("test3");
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult.steps).toHaveLength(4);
  const beforeHooksStep = testResult.steps[0];
  expect(beforeHooksStep.name).toBe("Before Hooks");
  expect(beforeHooksStep.steps).toHaveLength(1);

  const beforeAllStep = beforeHooksStep.steps[0];
  expect(beforeAllStep.name).toBe("beforeAll hook");
  expect(beforeAllStep.steps).toHaveLength(1);

  const beforeAllAttachmentStep = beforeAllStep.steps[0];
  expect(beforeAllAttachmentStep.name).toBe("test");
  expect(beforeAllAttachmentStep.attachments).toHaveLength(1);
  expect(beforeAllAttachmentStep.attachments[0]).toEqual(
    expect.objectContaining({
      name: "test",
      type: "text/plain",
    }),
  );

  const test2Step = testResult.steps[1];
  expect(test2Step.name).toBe("test2");
  expect(test2Step.steps).toHaveLength(1);

  const test2AttachmentStep = test2Step.steps[0];
  expect(test2AttachmentStep.name).toBe("test");
  expect(test2AttachmentStep.attachments).toHaveLength(1);
  expect(test2AttachmentStep.attachments[0]).toEqual(
    expect.objectContaining({
      name: "test",
      type: "text/plain",
    }),
  );

  const test3Step = testResult.steps[2];
  expect(test3Step.name).toBe("test3");
  expect(test3Step.steps).toHaveLength(1);

  const test3AttachmentStep = test3Step.steps[0];
  expect(test3AttachmentStep.name).toBe("test");
  expect(test3AttachmentStep.attachments).toHaveLength(1);
  expect(test3AttachmentStep.attachments[0]).toEqual(
    expect.objectContaining({
      name: "test",
      type: "text/plain",
    }),
  );

  const afterHooksStep = testResult.steps[3];
  expect(afterHooksStep.name).toBe("After Hooks");
  expect(afterHooksStep.steps).toHaveLength(0);
});
