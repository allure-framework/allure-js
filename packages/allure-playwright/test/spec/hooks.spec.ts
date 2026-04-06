import { Stage, Status } from "allure-js-commons";
import { expect, it } from "vitest";

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

it("should keep buffered log steps ordered with lambda steps in before hooks", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "@playwright/test";
      import { logStep, step } from "allure-js-commons";

      test.beforeEach(async () => {
        await step("1: lambda", async () => {
          await logStep("1.1: log");
          await step("1.2: lambda", async () => {});
        });

        await test.step("2: lambda", async () => {
          await logStep("2.1: log");
          await test.step("2.2: lambda", async () => {});
          await logStep("2.3: log");
        });
      });

      test("steps", async () => {});
    `,
  });

  const [testResult] = tests;
  const beforeHooks = testResult.steps.find((step) => step.name === "Before Hooks");

  expect(beforeHooks).toBeDefined();
  expect(beforeHooks!.steps).toHaveLength(1);
  expect(beforeHooks!.steps[0]).toMatchObject({
    name: "beforeEach hook",
  });
  expect(beforeHooks!.steps[0].steps.map((step) => step.name)).toEqual(["1: lambda", "2: lambda"]);
  expect(beforeHooks!.steps[0].steps[0].steps.map((step) => step.name)).toEqual(["1.1: log", "1.2: lambda"]);
  expect(beforeHooks!.steps[0].steps[1].steps.map((step) => step.name)).toEqual([
    "2.1: log",
    "2.2: lambda",
    "2.3: log",
  ]);
});

it("should keep buffered log steps ordered with lambda steps in after hooks", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "@playwright/test";
      import { logStep, step } from "allure-js-commons";

      test.afterEach(async () => {
        await step("1: lambda", async () => {
          await logStep("1.1: log");
          await step("1.2: lambda", async () => {});
        });

        await test.step("2: lambda", async () => {
          await logStep("2.1: log");
          await test.step("2.2: lambda", async () => {});
          await logStep("2.3: log");
        });
      });

      test("steps", async () => {});
    `,
  });

  const [testResult] = tests;
  const afterHooks = testResult.steps.find((step) => step.name === "After Hooks");

  expect(afterHooks).toBeDefined();
  expect(afterHooks!.steps).toHaveLength(1);
  expect(afterHooks!.steps[0]).toMatchObject({
    name: "afterEach hook",
  });
  expect(afterHooks!.steps[0].steps.map((step) => step.name)).toEqual(["1: lambda", "2: lambda"]);
  expect(afterHooks!.steps[0].steps[0].steps.map((step) => step.name)).toEqual(["1.1: log", "1.2: lambda"]);
  expect(afterHooks!.steps[0].steps[1].steps.map((step) => step.name)).toEqual([
    "2.1: log",
    "2.2: lambda",
    "2.3: log",
  ]);
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

it("keeps hook metadata without rendering empty hook sections", async () => {
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

       test("should contain label", async () => {
         await allure.label("hook", "5");
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
    ]),
  );
  expect(results.tests[0].steps).toEqual([]);
});

it("applies beforeEach runtime metadata without creating noisy hook steps when detail is false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from '@playwright/test';
      import * as allure from 'allure-js-commons';

      test.beforeEach(async () => {
        await allure.epic('epic');
        await allure.feature('feature');
        await allure.suite('suite');
        await allure.parentSuite('parentSuite');
        await allure.tms('tms1');
        await allure.tms('tms2');
        await allure.link('https://example.com', 'link');
      });

      test('shows metadata silently', async () => {
        expect(true).toBe(true);
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
    name: "shows metadata silently",
    status: Status.PASSED,
    labels: expect.arrayContaining([
      { name: "epic", value: "epic" },
      { name: "feature", value: "feature" },
      { name: "parentSuite", value: "parentSuite" },
      { name: "suite", value: "suite" },
    ]),
    links: expect.arrayContaining([
      expect.objectContaining({ type: "tms", url: "tms1" }),
      expect.objectContaining({ type: "tms", url: "tms2" }),
      expect.objectContaining({ name: "link", url: "https://example.com" }),
    ]),
    steps: [],
  });
});

it("keeps real hook steps while filtering runtime metadata transport steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from '@playwright/test';
      import * as allure from 'allure-js-commons';

      test.beforeEach(async () => {
        await allure.epic('epic');
        await test.step('real hook step', async () => {
        });
      });

      test('keeps real hook step', async () => {
        expect(true).toBe(true);
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
  expect(tests[0].labels).toEqual(expect.arrayContaining([{ name: "epic", value: "epic" }]));
  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "Before Hooks",
      steps: [expect.objectContaining({ name: "real hook step" })],
    }),
  ]);
});

it("applies hook step metadata without rendering transport steps when detail is false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from '@playwright/test';
      import * as allure from 'allure-js-commons';

      test.beforeEach(async () => {
        await allure.step('hook step', async (ctx) => {
          await ctx.displayName('renamed hook step');
          await ctx.parameter('hook-param', 'hook-value');
        });
      });

      test('uses hook step metadata silently', async () => {
        expect(true).toBe(true);
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
  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "Before Hooks",
      steps: [
        expect.objectContaining({
          name: "renamed hook step",
          parameters: [expect.objectContaining({ name: "hook-param", value: "hook-value" })],
          steps: [],
        }),
      ],
    }),
  ]);
});

it("keeps real hook attachments even when their names match runtime transport names", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from '@playwright/test';

      test.beforeEach(async () => {
        await test.info().attach("Allure Metadata (metadata)", {
          body: Buffer.from("hook-data-1"),
          contentType: "text/plain",
        });
        await test.info().attach("Allure Step Metadata", {
          body: Buffer.from("hook-data-2"),
          contentType: "text/plain",
        });
      });

      test('keeps reserved-name attachments in hooks', async () => {
        expect(true).toBe(true);
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
  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "Before Hooks",
      steps: [
        expect.objectContaining({
          name: "Allure Metadata (metadata)",
          attachments: [expect.objectContaining({ name: "Allure Metadata (metadata)", type: "text/plain" })],
        }),
        expect.objectContaining({
          name: "Allure Step Metadata",
          attachments: [expect.objectContaining({ name: "Allure Step Metadata", type: "text/plain" })],
        }),
      ],
    }),
  ]);

  const [attachment1] = tests[0].steps[0].steps[0].attachments;
  const [attachment2] = tests[0].steps[0].steps[1].attachments;
  expect(Buffer.from(attachments[attachment1.source] as string, "base64").toString("utf8")).toBe("hook-data-1");
  expect(Buffer.from(attachments[attachment2.source] as string, "base64").toString("utf8")).toBe("hook-data-2");
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

it("preserves failed hook root when transport-only steps are pruned", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test, expect } from '@playwright/test';

      test.beforeEach(async () => {
        await test.info().attach("Allure Metadata (metadata)", {
          body: Buffer.from(JSON.stringify({ type: "metadata", data: { labels: [{ name: "epic", value: "epic" }] } })),
          contentType: "application/vnd.allure.message+json",
        });
        throw new Error('hook failed');
      });

      test('never runs', async () => {
        expect(true).toBe(true);
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
  expect(tests[0].labels).toEqual(expect.arrayContaining([{ name: "epic", value: "epic" }]));
  expect(tests[0].steps).toEqual([
    expect.objectContaining({
      name: "Before Hooks",
      status: Status.FAILED,
      stage: Stage.FINISHED,
    }),
  ]);
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
