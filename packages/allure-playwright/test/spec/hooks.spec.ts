import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
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
        name: 'Wait for event "en_event"',
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

  expect(results.tests[0].steps).toHaveLength(4);
  expect(results.tests[0].steps[0]).toMatchObject({
    name: "Before Hooks",
  });
  expect(results.tests[0].steps[1]).toMatchObject({
    name: "step 1",
  });
  expect(results.tests[0].steps[2]).toMatchObject({
    name: "screenshot",
  });
  expect(results.tests[0].steps[3]).toMatchObject({
    name: "After Hooks",
  });
});

it("should hook steps have attachments", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
        const { test } = require("@playwright/test");
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
       };
    `,
  });
  const steps = results.tests[0].steps;

  expect(steps).toHaveLength(3);

  const beforeHooks = steps[0];
  const beforeAllHook = beforeHooks.steps[0];

  expect(beforeAllHook.name).equal("beforeAll hook");
  expect(beforeAllHook.steps).toEqual([
    expect.objectContaining({
      name: "attachment outside step beforeAll",
      attachments: [
        expect.objectContaining({
          name: "attachment outside step beforeAll",
          type: "application/json",
        }),
      ],
    }),
    expect.objectContaining({
      name: "i am beforeAll step",
      steps: [
        expect.objectContaining({
          name: "attachment in beforeAll step",
          attachments: [
            expect.objectContaining({
              name: "attachment in beforeAll step",
              type: "application/json",
            }),
          ],
        }),
      ],
    }),
  ]);

  const step1Attachment = steps[1];

  expect(step1Attachment.name).toEqual("step 1");
  expect(step1Attachment.steps).toEqual([
    expect.objectContaining({
      name: "attach in step 1",
      attachments: [
        expect.objectContaining({
          name: "attach in step 1",
          type: "application/json",
        }),
      ],
    }),
  ]);

  const afterHooks = steps[2];

  expect(afterHooks.steps[0].steps).toEqual([
    expect.objectContaining({
      name: "attachment outside step afterAll",
      attachments: [
        expect.objectContaining({
          name: "attachment outside step afterAll",
          type: "application/json",
        }),
      ],
    }),
    expect.objectContaining({
      name: "i am afterAll",
      steps: [
        expect.objectContaining({
          name: "test key afterall",
          attachments: [
            expect.objectContaining({
              name: "test key afterall",
              type: "application/json",
            }),
          ],
        }),
      ],
    }),
  ]);
});

it("should not loose tests metadata when when there are hooks in the test", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
       import test from '@playwright/test';
       import * as allure from "allure-js-commons";

       test.beforeAll(async () => {
         await allure.label("hook", "1");
       });

       test.beforeEach(async () => {
         await allure.label("hook", "2");
       });

       test.afterAll(async () => {
         await allure.label("hook", "3");
       });

       test.afterEach(async () => {
         await allure.label("hook", "4");
       });

       test("should contain label", async ({ page }) => {
         await allure.label("hook", "5");
       });
     `,
  });

  expect(results.tests).toHaveLength(1);
  expect(results.tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "hook",
        value: "1",
      },
      {
        name: "hook",
        value: "2",
      },
      {
        name: "hook",
        value: "3",
      },
      {
        name: "hook",
        value: "4",
      },
      {
        name: "hook",
        value: "5",
      },
    ]),
  );
  expect(results.tests[0].steps).toHaveLength(2);
  expect(results.tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Before Hooks",
      }),
      expect.objectContaining({
        name: "After Hooks",
      }),
    ]),
  );
});

it("handles test.step inside beforeEach when detail: false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
       import { test } from '@playwright/test';

       test.describe('test detail = false', () => {
         test.beforeEach('Before each test', async () => {
           await test.step('Before - test demo 1', () => {
           });
         });

         test('Demo Test 1', async () => {
           await test.step('Test - Demo Test 1 - Step A', () => {
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
  expect(tests[0]).toMatchObject({
    name: "Demo Test 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Before Hooks",
        status: Status.PASSED,
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "Before - test demo 1",
            status: Status.PASSED,
          }),
        ]),
      }),
      expect.objectContaining({
        name: "Test - Demo Test 1 - Step A",
        status: Status.PASSED,
      }),
    ]),
  );
});

it("handles test.step inside afterEach when detail: false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
       import { test } from '@playwright/test';

       test.describe('test detail = false', () => {
         test.afterEach('After each test', async () => {
           await test.step('After - test demo 1', () => {
           });
         });

         test('Demo Test 1', async () => {
           await test.step('Test - Demo Test 1 - Step A', () => {
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
  expect(tests[0]).toMatchObject({
    name: "Demo Test 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Test - Demo Test 1 - Step A",
        status: Status.PASSED,
      }),
      expect.objectContaining({
        name: "After Hooks",
        status: Status.PASSED,
        steps: expect.arrayContaining([
          expect.objectContaining({
            name: "After - test demo 1",
            status: Status.PASSED,
          }),
        ]),
      }),
    ]),
  );
});
