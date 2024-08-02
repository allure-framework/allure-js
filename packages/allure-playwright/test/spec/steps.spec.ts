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
