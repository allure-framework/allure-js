import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("should support skip annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test full report', {
        annotation: {
          type: "skip",
          description: "skipped via skip annotation",
        },
      }, async () => {
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test full report",
        status: "skipped",
        statusDetails: expect.objectContaining({
          message: "skipped via skip annotation",
        }),
      }),
    ]),
  );
});

it("should support fixme annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';

      test('test full report', {
        annotation: {
          type: "fixme",
          description: "skipped via fixme annotation",
        },
      }, async () => {
      });
      `,
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "test full report",
        status: "skipped",
        statusDetails: expect.objectContaining({
          message: "skipped via fixme annotation",
        }),
      }),
    ]),
  );
});


it("should support allure metadata in playwright annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';
      import { LabelName } from 'allure-js-commons';
      test('test full report', {
        annotation: [
          { type: "skip", description: "skipped via skip annotation" },
          { type: "fixme", description: "skipped via fixme annotation" },
          { type: "foo", description: "bar" },
          { type: LabelName.ALLURE_ID, description: "foo" },
          { type: LabelName.EPIC, description: "foo" },
          { type: LabelName.FEATURE, description: "foo" },
          { type: LabelName.LAYER, description: "foo" },
          { type: LabelName.OWNER, description: "foo" },
          { type: LabelName.PARENT_SUITE, description: "foo" },
          { type: LabelName.SUB_SUITE, description: "foo" },
          { type: LabelName.SUITE, description: "foo" },
          { type: LabelName.SEVERITY, description: "foo" },
          { type: LabelName.STORY, description: "foo" },
          { type: LabelName.TAG, description: "foo" },
        ],
      }, async () => {
      });
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).not.toContainEqual({ name: "fixme", value: "skipped via fixme annotation" });
  expect(tests[0].labels).not.toContainEqual({ name: "skip", value: "skipped via skip annotation" });
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
});

it("should support allure metadata in playwright group annotation", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';
      import { LabelName } from 'allure-js-commons';
      test.describe(
        'nested',
        {
          annotation: [
            { type: "foo", description: "bar" },
            { type: LabelName.EPIC, description: "foo" },
            { type: LabelName.FEATURE, description: "foo" },
            { type: LabelName.LAYER, description: "foo" },
            { type: LabelName.OWNER, description: "foo" },
            { type: LabelName.PARENT_SUITE, description: "foo" },
            { type: LabelName.SUB_SUITE, description: "foo" },
            { type: LabelName.SUITE, description: "foo" },
            { type: LabelName.SEVERITY, description: "foo" },
            { type: LabelName.STORY, description: "foo" },
            { type: LabelName.TAG, description: "foo" },
          ],
        },
        () => {
          test('test full report 1',  async () => {
          });
          test('test full report 2',  async () => {
          });
        },
      );
      `,
  });

  expect(tests).toHaveLength(2);
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });

  expect(tests[1].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.EPIC, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.FEATURE, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.LAYER, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.OWNER, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.PARENT_SUITE, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.SUB_SUITE, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.SUITE, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.SEVERITY, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.STORY, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.TAG, value: "foo" });
});
