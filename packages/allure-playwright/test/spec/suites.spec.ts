import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("reports a single suite structure", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import test from '@playwright/test';

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
        value: "javascript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "playwright",
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
      import test from '@playwright/test';

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
        value: "javascript",
      },
      {
        name: LabelName.FRAMEWORK,
        value: "playwright",
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
