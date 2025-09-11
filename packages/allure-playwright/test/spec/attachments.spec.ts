import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("doesn't not throw on missing attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should add attachment', async ({}, testInfo) => {
        testInfo.attachments.push({
          name: 'file-attachment',
          path: 'does-not-exist.txt',
          contentType: 'text/plain'
        });

        testInfo.attachments.push({
          name: 'buffer-attachment',
          body: Buffer.from('foo'),
          contentType: 'text/plain'
        });
      });
    `,
  });

  expect(tests[0].steps).toContainEqual(
    expect.objectContaining({
      name: "buffer-attachment",
      attachments: expect.arrayContaining([
        expect.objectContaining({
          name: "buffer-attachment",
          type: "text/plain",
        }),
      ]),
    }),
  );
});

it("adds snapshots correctly and provide a screenshot diff", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

      test('should add attachment', async ({ page }, testInfo) => {
        testInfo.snapshotSuffix = '';

        test.expect(await page.screenshot()).toMatchSnapshot("foo.png");
      });
    `,
    "sample.test.js-snapshots/foo-project.png": readFileSync(
      resolve(__dirname, "../samples/attachment-1-not-expected.png"),
    ),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].attachments).toContainEqual({
    name: "foo",
    type: "application/vnd.allure.image.diff",
    source: expect.stringMatching(/.*\.imagediff/),
  });
});

it("adds trace to the report as an attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';
      import * as allure from "allure-js-commons";
      import { ContentType } from "allure-js-commons";

      test('should do nothing', async ({ page }, testInfo) => {
        await allure.attachment("trace", "trace", ContentType.JPEG);

      });
    `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         outputDir: "./test-results",
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
             },
           ],
         ],
         projects: [
           {
             name: "project",
           },
         ],
         use: {
           trace: "on",
         }
      };
    `,
  });

  expect(tests[0].steps).toHaveLength(2);
  expect(tests[0].steps[0]).toMatchObject({
    name: "trace",
    attachments: [
      expect.objectContaining({
        name: "trace",
        type: "image/jpeg",
      }),
    ],
  });
  expect(tests[0].steps[1]).toMatchObject({
    name: "trace",
    attachments: [
      expect.objectContaining({
        name: "trace",
        type: "application/vnd.allure.playwright-trace",
        source: expect.stringMatching(/.*\.zip/),
      }),
    ],
  });
});

it("adds trace from stopChunk to the report as an attachment", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';
      import { attachTrace } from "allure-js-commons";

      test('should do nothing', async ({ page, context }, testInfo) => {
        await context.tracing.start({ screenshots: true, snapshots: true });
        await page.goto('https://playwright.dev');
        const chunkPath = 'allure-results/trace-chunk.zip';
        await context.tracing.stopChunk({ path: chunkPath });
        await attachTrace("trace-chunk", chunkPath);
      });
    `,
    "playwright.config.js": `
       import { defineConfig } from "@playwright/test";

       export default {
         outputDir: "./test-results",
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

  expect(tests[0].steps).toHaveLength(1);
  expect(tests[0].steps[0]).toMatchObject({
    name: "trace-chunk",
    attachments: [
      expect.objectContaining({
        name: "trace-chunk",
        type: "application/vnd.allure.playwright-trace",
        source: expect.stringMatching(/.*\.zip/),
      }),
    ],
  });
});

it("should support allure attachments with same names in hooks and test steps with info().attach", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      const example = async (some) => {
        await test.info().attach("test", {body: some});
      };

      test.beforeAll(async () => {
        await example("test1");
      });
      test.beforeEach(async () => {
        await example("test2");
      });
      test("testName", async () => {
        await test.step("test3", async () => {
          await example("test3");
        });
        await test.step("test4", async () => {
          await example("test4");
        });
      });
      test.afterEach(async () => {
        await example("test5");
      });
      test.afterAll(async () => {
        await example("test6");
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult.name).toBe("testName");
  expect(testResult.steps).toHaveLength(4);

  const beforeHooksStep = testResult.steps[0];
  expect(beforeHooksStep.name).toBe("Before Hooks");
  expect(beforeHooksStep.steps).toHaveLength(2);

  const beforeAllStep = beforeHooksStep.steps[0];
  expect(beforeAllStep.name).toBe("beforeAll hook");
  expect(beforeAllStep.steps).toHaveLength(1);
  expect(beforeAllStep.steps[0].name).toBe("test");
  expect(beforeAllStep.steps[0].attachments).toHaveLength(1);
  expect(beforeAllStep.steps[0].attachments[0]).toEqual(
    expect.objectContaining({
      name: "test",
      type: "text/plain",
    }),
  );

  const beforeAllAttachment = beforeAllStep.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[beforeAllAttachment.source] as string, "base64").toString()).toEqual("test1");

  const beforeEachStep = beforeHooksStep.steps[1];
  expect(beforeEachStep.name).toBe("beforeEach hook");
  expect(beforeEachStep.steps).toHaveLength(1);
  expect(beforeEachStep.steps[0].name).toBe("test");
  expect(beforeEachStep.steps[0].attachments).toHaveLength(1);
  const beforeEachAttachment = beforeEachStep.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[beforeEachAttachment.source] as string, "base64").toString()).toEqual("test2");

  const test3Step = testResult.steps[1];
  expect(test3Step.name).toBe("test3");
  expect(test3Step.steps).toHaveLength(1);
  expect(test3Step.steps[0].name).toBe("test");
  expect(test3Step.steps[0].attachments).toHaveLength(1);
  const test3Attachment = test3Step.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[test3Attachment.source] as string, "base64").toString()).toEqual("test3");

  const test4Step = testResult.steps[2];
  expect(test4Step.name).toBe("test4");
  expect(test4Step.steps).toHaveLength(1);
  expect(test4Step.steps[0].name).toBe("test");
  expect(test4Step.steps[0].attachments).toHaveLength(1);
  const test4Attachment = test4Step.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[test4Attachment.source] as string, "base64").toString()).toEqual("test4");

  const afterHooksStep = testResult.steps[3];
  expect(afterHooksStep.name).toBe("After Hooks");
  expect(afterHooksStep.steps).toHaveLength(2);

  const afterEachStep = afterHooksStep.steps[0];
  expect(afterEachStep.name).toBe("afterEach hook");
  expect(afterEachStep.steps).toHaveLength(1);
  expect(afterEachStep.steps[0].name).toBe("test");
  expect(afterEachStep.steps[0].attachments).toHaveLength(1);
  const afterEachAttachment = afterEachStep.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[afterEachAttachment.source] as string, "base64").toString()).toEqual("test5");

  const afterAllStep = afterHooksStep.steps[1];
  expect(afterAllStep.name).toBe("afterAll hook");
  expect(afterAllStep.steps).toHaveLength(1);
  expect(afterAllStep.steps[0].name).toBe("test");
  expect(afterAllStep.steps[0].attachments).toHaveLength(1);
  const afterAllAttachment = afterAllStep.steps[0].attachments[0];
  expect.soft(Buffer.from(attachments[afterAllAttachment.source] as string, "base64").toString()).toEqual("test6");
});

it("should support allure attachments with different names in hooks and test steps with info().attach", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';

      const example = async (some) => {
        await test.info().attach(some, {body: some});
      };

      test.beforeAll(async () => {
        await example("test1");
      });
      test.beforeEach(async () => {
        await example("test2");
      });
      test("testName", async () => {
        await test.step("test3", async () => {
          await example("test3");
        });
        await test.step("test4", async () => {
          await example("test4");
        });
      });
      test.afterEach(async () => {
        await example("test5");
      });
      test.afterAll(async () => {
        await example("test6");
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult.name).toBe("testName");

  const beforeHooksStep = testResult.steps.find((step) => step.name === "Before Hooks");
  const afterHooksStep = testResult.steps.find((step) => step.name === "After Hooks");
  const test3Step = testResult.steps.find((step) => step.name === "test3");
  const test4Step = testResult.steps.find((step) => step.name === "test4");

  expect(beforeHooksStep).toBeDefined();
  expect(afterHooksStep).toBeDefined();
  expect(test3Step).toBeDefined();
  expect(test4Step).toBeDefined();

  const beforeAllStep = beforeHooksStep!.steps.find((step) => step.name === "beforeAll hook");
  const beforeEachStep = beforeHooksStep!.steps.find((step) => step.name === "beforeEach hook");
  const afterEachStep = afterHooksStep!.steps.find((step) => step.name === "afterEach hook");
  const afterAllStep = afterHooksStep!.steps.find((step) => step.name === "afterAll hook");

  expect(beforeAllStep).toBeDefined();
  expect(beforeEachStep).toBeDefined();
  expect(afterEachStep).toBeDefined();
  expect(afterAllStep).toBeDefined();

  expect(beforeAllStep!.steps).toHaveLength(1);
  expect(beforeEachStep!.steps).toHaveLength(1);
  expect(afterEachStep!.steps).toHaveLength(1);
  expect(afterAllStep!.steps).toHaveLength(1);
  expect(test3Step!.steps).toHaveLength(1);
  expect(test4Step!.steps).toHaveLength(1);

  const beforeAllAttachmentStep = beforeAllStep!.steps[0];
  const beforeEachAttachmentStep = beforeEachStep!.steps[0];
  const afterEachAttachmentStep = afterEachStep!.steps[0];
  const afterAllAttachmentStep = afterAllStep!.steps[0];
  const test3AttachmentStep = test3Step!.steps[0];
  const test4AttachmentStep = test4Step!.steps[0];

  expect(beforeAllAttachmentStep.attachments).toHaveLength(1);
  expect(beforeEachAttachmentStep.attachments).toHaveLength(1);
  expect(afterEachAttachmentStep.attachments).toHaveLength(1);
  expect(afterAllAttachmentStep.attachments).toHaveLength(1);
  expect(test3AttachmentStep.attachments).toHaveLength(1);
  expect(test4AttachmentStep.attachments).toHaveLength(1);

  expect
    .soft(Buffer.from(attachments[beforeAllAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test1");
  expect
    .soft(Buffer.from(attachments[beforeEachAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test2");
  expect
    .soft(Buffer.from(attachments[test3AttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test3");
  expect
    .soft(Buffer.from(attachments[test4AttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test4");
  expect
    .soft(Buffer.from(attachments[afterEachAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test5");
  expect
    .soft(Buffer.from(attachments[afterAllAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("test6");
});

it("should support allure attachments with same names in hooks and test steps with allure.attachment", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from '@playwright/test';
      const allure = require('allure-js-commons');

      test.beforeEach(async ({}, testInfo) => {
        await allure.attachment('attachment', 'Data before test', 'text/plain');
      });

      test.afterEach(async ({}, testInfo) => {
        await allure.attachment('attachment', 'Data after test', 'text/plain');
      });

      test('Main test', async () => {
        await allure.attachment('attachment', 'Data inside test', 'text/plain');

        await allure.step('First step', async () => {
          await allure.attachment('attachment', 'Data inside step', 'text/plain');
        });

        await allure.step('Second step', async () => {
          await allure.attachment('attachment', 'Title checked', 'text/plain');
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const [testResult] = tests;

  expect(testResult.name).toBe("Main test");

  const beforeHooksStep = testResult.steps.find((step) => step.name === "Before Hooks");
  const afterHooksStep = testResult.steps.find((step) => step.name === "After Hooks");
  const firstStep = testResult.steps.find((step) => step.name === "First step");
  const secondStep = testResult.steps.find((step) => step.name === "Second step");
  const attachmentStep = testResult.steps.find((step) => step.name === "attachment");

  expect(beforeHooksStep).toBeDefined();
  expect(afterHooksStep).toBeDefined();
  expect(firstStep).toBeDefined();
  expect(secondStep).toBeDefined();
  expect(attachmentStep).toBeDefined();

  const beforeEachStep = beforeHooksStep!.steps.find((step) => step.name === "beforeEach hook");
  const afterEachStep = afterHooksStep!.steps.find((step) => step.name === "afterEach hook");

  expect(beforeEachStep).toBeDefined();
  expect(afterEachStep).toBeDefined();

  expect(beforeEachStep!.steps).toHaveLength(1);
  expect(afterEachStep!.steps).toHaveLength(1);
  expect(attachmentStep!.attachments).toHaveLength(1);
  expect(firstStep!.steps).toHaveLength(1);
  expect(secondStep!.steps).toHaveLength(1);

  const beforeEachAttachmentStep = beforeEachStep!.steps[0];
  const afterEachAttachmentStep = afterEachStep!.steps[0];
  const firstAttachmentStep = firstStep!.steps[0];
  const secondAttachmentStep = secondStep!.steps[0];

  expect(beforeEachAttachmentStep.attachments).toHaveLength(1);
  expect(afterEachAttachmentStep.attachments).toHaveLength(1);
  expect(firstAttachmentStep.attachments).toHaveLength(1);
  expect(secondAttachmentStep.attachments).toHaveLength(1);

  expect
    .soft(Buffer.from(attachments[beforeEachAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("Data before test");
  expect
    .soft(Buffer.from(attachments[attachmentStep!.attachments[0].source] as string, "base64").toString())
    .toEqual("Data inside test");
  expect
    .soft(Buffer.from(attachments[firstAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("Data inside step");
  expect
    .soft(Buffer.from(attachments[secondAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("Title checked");
  expect
    .soft(Buffer.from(attachments[afterEachAttachmentStep.attachments[0].source] as string, "base64").toString())
    .toEqual("Data after test");
});
