import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("handles single lambda step", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.spec.ts": `
      import { test } from '@playwright/test';
      import { step } from "allure-js-commons";

      test("steps", async () => {
        await step("step", () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "step",
      status: Status.PASSED,
      stage: Stage.FINISHED,
    }),
  );
});

it("handles single lambda step with attachment", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from '@playwright/test';
      import { attachment, step } from "allure-js-commons";

      test("steps", async () => {
        await step("step", async () => {
          await attachment("foo.txt", Buffer.from("bar"), "text/plain");
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(3);
  const [step] = tests[0].steps[1].steps;
  expect(step.name).toBe("foo.txt");

  const [attachment] = step.attachments;

  expect(attachment.name).toBe("foo.txt");
  expect(attachment.type).toBe("text/plain");
  expect(Buffer.from(attachments[attachment.source] as string, "base64").toString("utf8")).toBe("bar");
});

it("handles nested lambda steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from '@playwright/test';
      import { step } from "allure-js-commons";

      test("steps", async () => {
        await step("step 1", async () => {
          await step("step 2", async () => {
            await step("step 3", () => {
            });
          });
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps[1]).toMatchObject({
    name: "step 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps[1].steps).toHaveLength(1);
  expect(tests[0].steps[1].steps[0]).toMatchObject({
    name: "step 2",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps[1].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[1].steps[0].steps[0]).toMatchObject({
    name: "step 3",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
});

it("should support log steps", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from '@playwright/test';
      import { logStep } from "allure-js-commons";

      test("steps", async () => {
        await logStep("failed log step", "failed");
      });
    `,
  });

  const [testResult] = tests;
  expect(testResult.steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "failed log step",
        status: Status.FAILED,
      }),
    ]),
  );
});

it("should allow to set step metadata through its context", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.ts": `
      import { test } from "allure-playwright";
      import { step, attachment } from "allure-js-commons";

      test("steps", async () => {
        await step("step 1", async (ctx1) => {
          await ctx1.displayName("custom name 1");

          await step("step 2", async (ctx2) => {
            await ctx2.displayName("custom name 2");

            await step("step 3", async (ctx3) => {
              await ctx3.displayName("custom name 3");
              await ctx3.parameter("param", "value 3");
            });

            await ctx2.parameter("param", "value 2");
          });

          await ctx1.parameter("param", "value 1");
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps[0]).toMatchObject({
    name: "Before Hooks",
  });
  expect(tests[0].steps[1]).toMatchObject({
    name: "custom name 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
    parameters: [expect.objectContaining({ name: "param", value: "value 1" })],
  });
  expect(tests[0].steps[1].steps).toHaveLength(1);
  expect(tests[0].steps[1].steps[0]).toMatchObject({
    name: "custom name 2",
    status: Status.PASSED,
    stage: Stage.FINISHED,
    parameters: [expect.objectContaining({ name: "param", value: "value 2" })],
  });
  expect(tests[0].steps[1].steps[0].steps).toHaveLength(1);
  expect(tests[0].steps[1].steps[0].steps[0]).toMatchObject({
    name: "custom name 3",
    status: Status.PASSED,
    stage: Stage.FINISHED,
    parameters: [expect.objectContaining({ name: "param", value: "value 3" })],
  });
  expect(tests[0].steps[2]).toMatchObject({
    name: "After Hooks",
  });
});

it("should use native playwright steps under the hood", async () => {
  const { tests, restFiles } = await runPlaywrightInlineTest({
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
           ["json", { outputFile: "./test-results.json" }],
         ],
         projects: [
           {
             name: "project",
           },
         ],
       };
    `,
    "sample.test.ts": `
      import { test } from "allure-playwright";
      import { step } from "allure-js-commons";

      test("steps", async () => {
        await step("step 1", async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].steps).toHaveLength(3);
  expect(tests[0].steps[0]).toMatchObject({
    name: "Before Hooks",
  });
  expect(tests[0].steps[1]).toMatchObject({
    name: "step 1",
    status: Status.PASSED,
    stage: Stage.FINISHED,
  });
  expect(tests[0].steps[2]).toMatchObject({
    name: "After Hooks",
  });
  expect(restFiles["test-results.json"]).toBeDefined();

  const pwTestResults = JSON.parse(restFiles["test-results.json"]);

  expect(pwTestResults.suites[0].specs[0].tests[0].results[0].steps[0]).toMatchObject({
    title: "step 1",
  });
});

it("reports parallel steps correctly with Promise.all", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
      import { test, expect } from "@playwright/test";

      test("parallel steps", async ({ page, browser }) => {
        const t1 = test.step("Step 1: Thread 1", async () => {
          await test.step("T1 - Step 1", async () => {
            await page.goto("https://example.com/#t1-1");
          });
          await test.step("T1 - Step 2", async () => {
            await page.goto("https://example.com/#t1-2");
          });
        });

        const t2 = test.step("Step 2: Thread 2", async () => {
          const ctx = await browser.newContext();
          const p2 = await ctx.newPage();
          await test.step("T2 - Prepare", async () => {});
          await test.step("T2 - Step 1", async () => {
            await p2.goto("https://example.com/#t2-1");
          });
          await test.step("T2 - Step 2", async () => {
            await p2.goto("https://example.com/#t2-2");
          });
          await test.step("T2 - Cleanup", async () => { await p2.close(); await ctx.close(); });
        });

        await Promise.all([t1, t2]);

        await test.step("Final Step: Done", async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;

  const step1 = tr.steps.find((s) => s.name === "Step 1: Thread 1");
  const step2 = tr.steps.find((s) => s.name === "Step 2: Thread 2");
  const final = tr.steps.find((s) => s.name === "Final Step: Done");

  expect(step1?.stage).toBe(Stage.FINISHED);
  expect(step2?.stage).toBe(Stage.FINISHED);
  expect(final?.stage).toBe(Stage.FINISHED);
  expect(final?.status).toBe(Status.PASSED);

  const t1s1 = step1?.steps.find((s) => s.name === "T1 - Step 1");
  const t1s2 = step1?.steps.find((s) => s.name === "T1 - Step 2");
  expect(t1s1?.status).toBe(Status.PASSED);
  expect(t1s2?.status).toBe(Status.PASSED);

  const t2prep = step2?.steps.find((s) => s.name === "T2 - Prepare");
  const t2s1 = step2?.steps.find((s) => s.name === "T2 - Step 1");
  const t2s2 = step2?.steps.find((s) => s.name === "T2 - Step 2");
  const t2clean = step2?.steps.find((s) => s.name === "T2 - Cleanup");

  expect(t2prep?.stage).toBe(Stage.FINISHED);
  expect(t2s1?.stage).toBe(Stage.FINISHED);
  expect(t2s2?.stage).toBe(Stage.FINISHED);
  expect(t2clean?.stage).toBe(Stage.FINISHED);
});

it("isolates failure in one parallel branch", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
      import { test, expect } from "@playwright/test";

      test("parallel failure isolation", async () => {
        const t1 = test.step("Step 1: Thread 1", async () => {
          await test.step("T1 ok", async () => {});
        });

        const t2 = test.step("Step 2: Thread 2", async () => {
          await test.step("T2 boom", async () => { expect(1).toBe(2); });
          await test.step("T2 after", async () => {});
        });

        await Promise.allSettled([t1, t2]);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [tr] = tests;

  const step1 = tr.steps.find((s) => s.name === "Step 1: Thread 1");
  const step2 = tr.steps.find((s) => s.name === "Step 2: Thread 2");

  expect(step1?.status).toBe(Status.PASSED);
  expect(step2?.status).toBe(Status.FAILED);

  const t1ok = step1?.steps.find((s) => s.name === "T1 ok");
  const t2boom = step2?.steps.find((s) => s.name === "T2 boom");

  expect(t1ok?.status).toBe(Status.PASSED);
  expect(t2boom?.status).toBe(Status.FAILED);
  expect(t2boom?.statusDetails?.message).toContain("toBe");
});
