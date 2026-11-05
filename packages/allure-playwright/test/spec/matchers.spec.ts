import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

it.each([
  { detail: undefined, reportMatchers: undefined, matchers: true, api: true },
  { detail: true, reportMatchers: undefined, matchers: true, api: true },
  { detail: false, reportMatchers: undefined, matchers: false, api: false },
  { detail: undefined, reportMatchers: true, matchers: true, api: true },
  { detail: true, reportMatchers: true, matchers: true, api: true },
  { detail: false, reportMatchers: true, matchers: true, api: false },
  { detail: undefined, reportMatchers: false, matchers: false, api: true },
  { detail: true, reportMatchers: false, matchers: false, api: true },
  { detail: false, reportMatchers: false, matchers: false, api: false },
])("filters assertions independently with detail=$detail, reportMatchers=$reportMatchers", async (options) => {
  const { tests } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [['allure-playwright', ${JSON.stringify({
        detail: options.detail,
        reportMatchers: options.reportMatchers,
      })}]] };
    `,
    "sample.test.js": `
      const { test, expect } = require('@playwright/test');
      test('sample', async ({ page }) => {
        await test.step('User step', async () => {
          await page.setContent('<h1>Example</h1>');
          await expect(page.locator('h1'), 'Readable assertion').toHaveText('Example');
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe("passed");
  const userStep = tests[0].steps.find((step) => step.name === "User step");
  expect(userStep).toBeDefined();
  const assertions = userStep!.steps.filter((step) => step.name?.startsWith("Readable assertion"));
  expect(assertions).toHaveLength(Number(options.matchers));
  expect(userStep!.steps).toHaveLength(Number(options.matchers) + Number(options.api));
});

it("reports hook, polling and failed assertions without native API steps", async () => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [['allure-playwright', { detail: false, reportMatchers: true }]] };
    `,
    "sample.test.js": `
      const { test, expect } = require('@playwright/test');
      test.beforeEach(() => {
        expect(1, 'Setup assertion').toBe(1);
      });
      test.afterEach(() => {
        expect(1, 'Cleanup assertion').toBe(1);
      });
      test('sample', async () => {
        await test.step('User step', async () => {
          await expect.poll(() => 1, { message: 'Polling assertion' }).toBe(1);
          expect.soft(1, 'Soft failure').toBe(2);
          await test.info().attach('Evidence', { body: 'evidence', contentType: 'text/plain' });
          expect(1, 'Hard failure').toBe(2);
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({
    status: "failed",
    statusDetails: { message: expect.stringContaining("Soft failure") },
    steps: expect.arrayContaining([
      expect.objectContaining({
        name: "Before Hooks",
        steps: [expect.objectContaining({ name: "Setup assertion", status: "passed" })],
      }),
      expect.objectContaining({
        name: "User step",
        status: "failed",
        steps: [
          expect.objectContaining({ name: "Polling assertion", status: "passed" }),
          expect.objectContaining({
            name: "Soft failure",
            status: "failed",
            statusDetails: { message: expect.stringContaining("Soft failure"), trace: expect.any(String) },
          }),
          expect.objectContaining({ name: "Evidence" }),
          expect.objectContaining({ name: "Hard failure", status: "failed" }),
        ],
      }),
      expect.objectContaining({
        name: "After Hooks",
        steps: [expect.objectContaining({ name: "Cleanup assertion", status: "passed" })],
      }),
    ]),
  });
  const userStep = tests[0].steps.find((step) => step.name === "User step")!;
  const evidence = userStep.steps[2].attachments[0];
  expect(evidence).toMatchObject({ name: "Evidence", type: "text/plain" });
  expect(Buffer.from(attachments[evidence.source] as string, "base64").toString()).toBe("evidence");
});

it.each([true, false])("preserves user steps inside matchers with reportMatchers=%s", async (reportMatchers) => {
  const { tests, attachments } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [['allure-playwright', { detail: false, reportMatchers: ${reportMatchers} }]] };
    `,
    "sample.test.js": `
      const { test, expect } = require('@playwright/test');
      const customExpect = expect.extend({
        async toKeepEvidence() {
          await test.step('User evidence', async () => {
            await test.info().attach('Evidence', { body: 'evidence', contentType: 'text/plain' });
          });
          return { pass: true, message: () => 'Expected evidence' };
        },
      });
      test('sample', async () => {
        await customExpect(null, 'Matcher assertion').toKeepEvidence();
        await test.step('Sibling', async () => {});
      });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe("passed");
  const evidenceStep = expect.objectContaining({
    name: "User evidence",
    status: "passed",
    steps: [expect.objectContaining({ name: "Evidence" })],
  });
  expect(tests[0].steps).toEqual([
    reportMatchers
      ? expect.objectContaining({ name: "Matcher assertion", status: "passed", steps: [evidenceStep] })
      : evidenceStep,
    expect.objectContaining({ name: "Sibling", status: "passed", steps: [] }),
  ]);
  const userStep = reportMatchers ? tests[0].steps[0].steps[0] : tests[0].steps[0];
  const evidence = userStep.steps[0].attachments[0];
  expect(evidence).toMatchObject({ name: "Evidence", type: "text/plain" });
  expect(Buffer.from(attachments[evidence.source] as string, "base64").toString()).toBe("evidence");
});
