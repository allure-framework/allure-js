import { LabelName, LinkType } from "allure-js-commons";
import { expect, it } from "vitest";

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

it.each([
  { reportAnnotations: undefined, detail: true },
  { reportAnnotations: true, detail: true },
  { reportAnnotations: false, detail: true },
  { reportAnnotations: undefined, detail: false },
  { reportAnnotations: true, detail: false },
  { reportAnnotations: false, detail: false },
])("controls annotation steps with reportAnnotations=$reportAnnotations and detail=$detail", async (options) => {
  const { tests, attachments, restFiles } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [
        ['allure-playwright', ${JSON.stringify(options)}],
        ['./observer.cjs'],
      ] };
    `,
    "observer.cjs": `
      const { writeFileSync } = require('node:fs');
      module.exports = class {
        onTestBegin(test) {
          if (test.title === 'annotated') {
            writeFileSync('annotations.json', JSON.stringify(test.annotations));
          }
        }
      };
    `,
    "sample.test.js": `
      const { test } = require('@playwright/test');
      test.describe('group', { annotation: [
        { type: 'group', description: 'integration' },
        { type: 'allure.label.owner', description: 'maintainer' },
      ] }, () => {
        test('annotated', { annotation: [
          { type: 'external', description: 'case-17' },
          { type: '@allure.id', description: '42' },
          { type: 'allure.label.epic', description: 'Reporting' },
          { type: 'issue', description: 'https://example.test/issue/17' },
          { type: 'tms', description: 'https://example.test/tms/17' },
          { type: 'test_key', description: 'https://example.test/key/17' },
          { type: 'description', description: 'Description stays' },
        ] }, async () => {
          await test.step('User step', async () => {
            await test.info().attach('Evidence', { body: 'evidence', contentType: 'text/plain' });
          });
        });
      });
      test('control', async () => {});
    `,
  });

  expect(tests).toHaveLength(2);
  const annotated = tests.find((test) => test.name === "annotated")!;
  const control = tests.find((test) => test.name === "control")!;
  expect(annotated).toMatchObject({ status: "passed", description: "Description stays" });
  expect(annotated.labels).toEqual(
    expect.arrayContaining([
      { name: LabelName.OWNER, value: "maintainer" },
      { name: LabelName.ALLURE_ID, value: "42" },
      { name: LabelName.EPIC, value: "Reporting" },
    ]),
  );
  expect(annotated.links).toEqual([
    expect.objectContaining({ type: LinkType.ISSUE, url: "https://example.test/issue/17" }),
    expect.objectContaining({ type: LinkType.TMS, url: "https://example.test/tms/17" }),
    expect.objectContaining({ type: LinkType.TMS, url: "https://example.test/key/17" }),
  ]);
  const annotationSteps = annotated.steps.filter(
    (step) => step.name === "group: integration" || step.name === "external: case-17",
  );
  expect(annotationSteps.map((step) => step.name)).toEqual(
    options.reportAnnotations === false ? [] : ["group: integration", "external: case-17"],
  );
  const evidence = annotated.steps.find((step) => step.name === "User step")!.steps[0].attachments[0];
  expect(evidence).toMatchObject({ name: "Evidence", type: "text/plain" });
  expect(Buffer.from(attachments[evidence.source] as string, "base64").toString()).toBe("evidence");
  expect(control.status).toBe("passed");
  expect(control.labels).not.toContainEqual({ name: LabelName.OWNER, value: "maintainer" });
  expect(control.description).toBeUndefined();
  expect(control.links).toEqual([]);
  expect(JSON.parse(restFiles["annotations.json"])).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ type: "group", description: "integration" }),
      expect.objectContaining({ type: "external", description: "case-17" }),
      expect.objectContaining({ type: "@allure.id", description: "42" }),
      expect.objectContaining({ type: "description", description: "Description stays" }),
    ]),
  );
});

it.each(["skip", "fixme"])("preserves %s semantics with annotation steps disabled", async (type) => {
  const { tests } = await runPlaywrightInlineTest({
    "playwright.config.js": `
      module.exports = { reporter: [['allure-playwright', { detail: false, reportAnnotations: false }]] };
    `,
    "sample.test.js": `
      const { test } = require('@playwright/test');
      test('sample', { annotation: [
        { type: '${type}', description: 'Not ready' },
        { type: '@allure.id', description: '42' },
        { type: 'external', description: 'hidden' },
      ] }, async () => { throw new Error('Must not run'); });
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toMatchObject({ status: "skipped", statusDetails: { message: "Not ready" }, steps: [] });
  expect(tests[0].labels).toContainEqual({ name: LabelName.ALLURE_ID, value: "42" });
});
