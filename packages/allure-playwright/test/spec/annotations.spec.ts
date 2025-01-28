import { expect, it } from "vitest";
import { LabelName, LinkType } from "allure-js-commons";
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
          { type: "@allure.id", description: "foo" },
          { type: "@allure.label.foo", description: "bar" },
          { type: "allure.label.epic", description: "baz" },
          { type: "issue", description: "anything 2" },
          { type: "tms", description: "anything 3" },
          { type: "test_key", description: "anything 4" },
          { type: "description", description: "new test description" },
        ],
      }, async () => {
      });
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("new test description");
  expect(tests[0].labels).not.toContainEqual({ name: "description", value: "new test description" });
  expect(tests[0].labels).not.toContainEqual({ name: "skip", value: "skipped via skip annotation" });
  expect(tests[0].labels).not.toContainEqual({
    name: "fixme",
    value: "skipped via fixme annotation",
  });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "baz" });
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].links).toContainEqual({ type: LinkType.ISSUE, url: "anything 2" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 3" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 4" });
});

it("should append unknown playwright annotation to the test description", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';
      import { LabelName } from 'allure-js-commons';
      test('test full report', {
        annotation: [
          { type: "skip", description: "skipped via skip annotation" },
          { type: "fixme", description: "skipped via fixme annotation" },
          { type: "@allure.id", description: "foo" },
          { type: "@allure.label.foo", description: "bar" },
          { type: "allure.label.epic", description: "baz" },
          { type: "issue", description: "anything 2" },
          { type: "tms", description: "anything 3" },
          { type: "test_key", description: "anything 4" },
          { type: "description", description: "new test description" },
          { type: "unknown", description: "unknown annotation" },
        ],
      }, async () => {
      });
      `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("new test description");
  expect(tests[0].labels).not.toContainEqual({ name: "description", value: "new test description" });
  expect(tests[0].labels).not.toContainEqual({ name: "skip", value: "skipped via skip annotation" });
  expect(tests[0].labels).not.toContainEqual({
    name: "fixme",
    value: "skipped via fixme annotation",
  });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "baz" });
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].links).toContainEqual({ type: LinkType.ISSUE, url: "anything 2" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 3" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 4" });
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "unknown: unknown annotation" }));
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
            { type: "skip", description: "skipped via skip annotation" },
            { type: "fixme", description: "skipped via fixme annotation" },
            { type: "@allure.id", description: "foo" },
            { type: "@allure.label.foo", description: "bar" },
            { type: "allure.label.epic", description: "baz" },
            { type: "issue", description: "anything 2" },
            { type: "tms", description: "anything 3" },
            { type: "test_key", description: "anything 4" },
            { type: "description", description: "new test description" },
            { type: "unknown", description: "unknown annotation" },
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
  expect(tests[0].description).toBe("new test description");
  expect(tests[0].labels).not.toContainEqual({ name: "description", value: "new test description" });
  expect(tests[0].labels).not.toContainEqual({ name: "skip", value: "skipped via skip annotation" });
  expect(tests[0].labels).not.toContainEqual({
    name: "fixme",
    value: "skipped via fixme annotation",
  });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[0].labels).toContainEqual({ name: LabelName.EPIC, value: "baz" });
  expect(tests[0].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[0].links).toContainEqual({ type: LinkType.ISSUE, url: "anything 2" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 3" });
  expect(tests[0].links).toContainEqual({ type: LinkType.TMS, url: "anything 4" });
  expect(tests[0].steps).toContainEqual(expect.objectContaining({ name: "unknown: unknown annotation" }));
  expect(tests[1].description).toBe("new test description");
  expect(tests[1].labels).not.toContainEqual({ name: "description", value: "new test description" });
  expect(tests[1].labels).not.toContainEqual({ name: "skip", value: "skipped via skip annotation" });
  expect(tests[1].labels).not.toContainEqual({
    name: "fixme",
    value: "skipped via fixme annotation",
  });
  expect(tests[1].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "foo" });
  expect(tests[1].labels).toContainEqual({ name: LabelName.EPIC, value: "baz" });
  expect(tests[1].labels).toContainEqual({ name: "foo", value: "bar" });
  expect(tests[1].links).toContainEqual({ type: LinkType.ISSUE, url: "anything 2" });
  expect(tests[1].links).toContainEqual({ type: LinkType.TMS, url: "anything 3" });
  expect(tests[1].links).toContainEqual({ type: LinkType.TMS, url: "anything 4" });
  expect(tests[1].steps).toContainEqual(expect.objectContaining({ name: "unknown: unknown annotation" }));
});
