import { expect, it } from "vitest";
import { Status } from "allure-js-commons/new/sdk/node";
import { runPlaywrightInlineTest } from "../utils";

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
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
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
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: Status.PASSED,
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: Status.PASSED }),
            expect.objectContaining({ name: "inner step 1.2", status: Status.PASSED }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: Status.PASSED,
          steps: [
            expect.objectContaining({ name: "inner step 2.1", status: Status.PASSED }),
            expect.objectContaining({ name: "inner step 2.2", status: Status.PASSED }),
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
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
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
      steps: [
        expect.objectContaining({
          name: "outer step 1",
          status: Status.PASSED,
          steps: [
            expect.objectContaining({ name: "inner step 1.1", status: Status.PASSED }),
            expect.objectContaining({ name: "inner step 1.2", status: Status.PASSED }),
          ],
        }),
        expect.objectContaining({
          name: "outer step 2",
          status: Status.FAILED,
          steps: [
            expect.objectContaining({
              name: "inner step 2.1",
              status: Status.FAILED,
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
