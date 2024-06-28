import { expect, it } from "vitest";
import { LabelName } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

const testFile = `
  import test from '@playwright/test';

  test.beforeEach(() => {
      console.log("This is the beforeEach hook");
  });

  test('my test', async () => {});

  test.afterEach(() => {
      console.log("This is the afterEach hook");
  });
`;

const suiteTitle = {
  labels: expect.arrayContaining([{ name: LabelName.SUITE, value: "sample.test.js" }]),
};

const detailSteps = {
  steps: [
    expect.objectContaining({ name: "Before Hooks", status: "passed" }),
    expect.objectContaining({ name: "After Hooks", status: "passed" }),
  ],
};

it("default options should include detail and suiteTitle", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": testFile,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0]).toEqual(
    expect.objectContaining({
      ...suiteTitle,
      ...detailSteps,
    }),
  );
});

it("detail and suiteTitle true", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": testFile,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: true,
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
  expect(tests[0]).toEqual(
    expect.objectContaining({
      ...suiteTitle,
      ...detailSteps,
    }),
  );
});

it("detail and suiteTitle false", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": testFile,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               detail: false,
               suiteTitle: false,
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
  expect(tests[0]).not.toEqual(
    expect.objectContaining({
      ...suiteTitle,
      ...detailSteps,
    }),
  );
});
