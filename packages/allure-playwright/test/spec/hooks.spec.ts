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

  expect(results.tests[0]).toEqual(
    expect.objectContaining({
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
          name: "Worker Cleanup",
          status: Status.PASSED,
        }),
        expect.objectContaining({
          name: "After Hooks",
          status: Status.FAILED,
        }),
      ],
    }),
  );
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
