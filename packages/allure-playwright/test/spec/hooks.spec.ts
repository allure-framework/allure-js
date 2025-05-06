import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("handles before hooks", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
       import test from '@playwright/test';

       test.beforeAll(async () => {});

       test.beforeEach(async () => {});

       test("should contain hooks", async () => {});
     `,
  });
  const [beforeHooks] = tests[0].steps;

  expect(beforeHooks).toMatchObject({
    name: "Before Hooks",
    steps: expect.arrayContaining([
      expect.objectContaining({
        name: "beforeAll hook",
        stop: expect.any(Number),
        start: expect.any(Number),
      }),
      expect.objectContaining({
        name: "beforeEach hook",
        stop: expect.any(Number),
        start: expect.any(Number),
      }),
    ]),
  });
});

it("handles after hooks", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
       import test from '@playwright/test';

       test.afterAll(async () => {});

       test.afterEach(async () => {});

       test("should contain hooks", async () => {});
     `,
  });
  const [, afterHooks] = results.tests[0].steps;

  expect(afterHooks).toMatchObject(
    expect.objectContaining({
      steps: [
        expect.objectContaining({
          name: "afterEach hook",
          stop: expect.any(Number),
          start: expect.any(Number),
        }),
        expect.objectContaining({
          name: "afterAll hook",
          stop: expect.any(Number),
          start: expect.any(Number),
        }),
      ],
    }),
  );
});

it("should mark step as failed when any child step is failed", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
       import test from '@playwright/test';

       test("should contain hooks", async ({ page }) => {
         await page.waitForEvent("en_event");
       });
     `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             "allure-playwright",
             {
               resultsDir: "./allure-results",
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
         timeout: 1000,
         screenshot: "on",
       };
    `,
  });

  expect(results.tests[0]).toMatchObject({
    name: "should contain hooks",
    status: Status.BROKEN,
    steps: [
      expect.objectContaining({
        name: "Before Hooks",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "page.waitForEvent",
        status: Status.FAILED,
      }),
      expect.objectContaining({
        name: "After Hooks",
        status: Status.PASSED,
      }),
    ],
  });
});

it("keeps correct hooks structure when something failed", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
       import test from '@playwright/test';

       test.beforeAll(async () => {});

       test.beforeEach(async () => {});

       test.afterAll(async () => {});

       test.afterEach(async () => {});

       test("should contain hooks", async ({ page }) => {
         await test.step("step 1", async () => {
           await page.waitForEvent("en_event");
         });
       });
     `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         reporter: [
           [
             "allure-playwright",
             {
               resultsDir: "./allure-results",
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
         timeout: 1000,
         use: {
           screenshot: "on",
         },
       };
    `,
  });

  expect(results.tests[0].steps).toHaveLength(3);
  expect(results.tests[0].steps[0]).toMatchObject({
    name: "Before Hooks",
  });
  expect(results.tests[0].steps[1]).toMatchObject({
    name: "step 1",
  });
  expect(results.tests[0].steps[2]).toMatchObject({
    name: "After Hooks",
  });
});

it("should hook steps have attachments", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
        const {test} = require("@playwright/test");
        const allure = require("allure-js-commons");
        test.beforeAll(async () => {
            await allure.attachment('attachment outside step beforeAll', 'test value', 'application/json');
            await allure.step('i am beforeAll step', async () => {
                await allure.attachment('attachment in beforeAll step', 'test value', 'application/json');
            });
        });
        test.afterAll(async () => {
            await allure.attachment('attachment outside step afterAll', 'test value', 'application/json');
            await allure.step('i am afterAll', async () => {
                await allure.attachment('test key afterall', 'test value', 'application/json');
            });
        });
        test("sample test", async () => {
            await allure.step("step 1", async () => {
                await allure.attachment('attach in step 1', 'test value', 'application/json');
            });
            await allure.step("step 2", async () => {
                await allure.attachment('attach in step 2', 'test value', 'application/json');
            });
            await allure.attachment('i am just attachment in test', 'test value', 'application/json');
        });
    `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         reporter: [
           [
             "allure-playwright",
             {
               resultsDir: "./allure-results",
             },
           ],
           ["dot"],
         ],
         projects: [
           {
             name: "project",
           },
         ],
         timeout: 1000,
         use: {
           screenshot: "on",
         },
       };
    `,
  });

  const steps = results.tests[0].steps;

  const beforeHook = steps.find((step) => step.name === "Before Hooks");
  expect(beforeHook).toBeDefined();
  expect(beforeHook?.attachments).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "attachment outside step beforeAll",
        type: "application/json",
      }),
    ]),
  );

  expect(beforeHook?.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "i am beforeAll step",
        attachments: expect.arrayContaining([
          expect.objectContaining({
            name: "attachment in beforeAll step",
            type: "application/json",
          }),
        ]),
      }),
    ]),
  );
});
