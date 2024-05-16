import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils";

it("sets runtime labels", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, expect } from "@playwright/test";
      import {
        label,
        labels,
        feature,
        allureId,
        epic,
        layer,
        owner,
        parentSuite,
        suite,
        subSuite,
        severity,
        story,
        tag,
      } from "allure-js-commons";

      test("should add epic label", async ({}, testInfo) => {
        await label("foo", "bar");
        await allureId("foo");
        await epic("foo");
        await feature("foo");
        await layer("foo");
        await owner("foo");
        await parentSuite("foo");
        await subSuite("foo");
        await suite("foo");
        await severity("foo");
        await story("foo");
        await tag("foo");
        await labels({ name: "test", value: "testValue" }, { name: "test2", value: "testValue2" });
      });
    `,
  });

  expect(tests).toHaveLength(1);
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
  expect(tests[0].labels).toContainEqual({ name: "test", value: "testValue" });
  expect(tests[0].labels).toContainEqual({ name: "test2", value: "testValue2" });
});

it("reports a single suite structure", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';

      test.describe('suite', () => {
        test('should work', async ({}) => {});
      });
    `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               testMode: true,
               suiteTitle: true,
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
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: LabelName.LANGUAGE,
        value: "JavaScript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "Playwright",
      },
      {
        name: LabelName.PARENT_SUITE,
        value: "project",
      },
      {
        name: LabelName.SUITE,
        value: "sample.test.js",
      },
      {
        name: LabelName.SUB_SUITE,
        value: "suite",
      },
    ]),
  );
});

it("reports a multiple nested suites structure", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from 'allure-playwright';

      test.describe('parent suite 2', () => {
        test.describe('suite 2', () => {
          test.describe('sub suite 2', () => {
            test('should work 2', async ({}) => {});
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
               testMode: true,
               suiteTitle: true,
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
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: LabelName.LANGUAGE,
        value: "JavaScript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "Playwright",
      },
      {
        name: LabelName.PARENT_SUITE,
        value: "project",
      },
      {
        name: LabelName.SUITE,
        value: "sample.test.js",
      },
      {
        name: LabelName.SUB_SUITE,
        value: "parent suite 2 > suite 2 > sub suite 2",
      },
    ]),
  );
});
