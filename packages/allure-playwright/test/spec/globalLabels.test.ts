import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("has environment info", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "a.test.ts": `
       import { test, expect } from '@playwright/test';

       test('does nothing', async ({}, testInfo) => {
       });
     `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright"),
             {
               resultsDir: "./allure-results",
               globalLabels: [
                 {
                   name: "foo",
                   value: "bar"
                 }
               ]
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
  expect(tests[0].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
});
