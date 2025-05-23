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
