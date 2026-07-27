import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

const testFile = `
  import test from '@playwright/test';

  test.afterEach(async ({}, testInfo) => {
    await testInfo.attach("after-hook-attachment", {
      body: "log content",
      contentType: "text/plain",
    });
  });

  test('sample', async () => {});
`;

const configWith = (flattenReport: boolean) => `
  module.exports = {
    reporter: [
      [
        require.resolve("allure-playwright"),
        {
          resultsDir: "./allure-results",
          flattenReport: ${flattenReport},
        },
      ],
    ],
  };
`;

it("nests afterEach attachment inside After Hooks step when flattenReport is false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": testFile,
    "playwright.config.js": configWith(false),
  });

  expect(tests).toHaveLength(1);

  const afterHooks = tests[0].steps.find((s: any) => s.name === "After Hooks");
  expect(afterHooks).toBeDefined();

  const nested = afterHooks.steps
    .flatMap((s: any) => s.steps ?? [])
    .flatMap((s: any) => s.attachments ?? [])
    .find((a: any) => a.name === "after-hook-attachment");
  expect(nested).toMatchObject({ name: "after-hook-attachment", type: "text/plain" });

  expect(tests[0].attachments.find((a: any) => a.name === "after-hook-attachment")).toBeUndefined();
});

it("places afterEach attachment at test root level when flattenReport is true", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": testFile,
    "playwright.config.js": configWith(true),
  });

  expect(tests).toHaveLength(1);

  expect(tests[0].attachments).toContainEqual(
    expect.objectContaining({ name: "after-hook-attachment", type: "text/plain" }),
  );

  const afterHooks = tests[0].steps.find((s: any) => s.name === "After Hooks");
  if (afterHooks) {
    const nested = afterHooks.steps
      .flatMap((s: any) => [...(s.attachments ?? []), ...(s.steps ?? []).flatMap((ss: any) => ss.attachments ?? [])])
      .find((a: any) => a.name === "after-hook-attachment");
    expect(nested).toBeUndefined();
  }
});
