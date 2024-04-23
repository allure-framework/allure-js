import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils";

it("has environment info", async () => {
  const { envInfo } = await runPlaywrightInlineTest({
    "a.test.ts": `
       import { test, expect } from 'allure-playwright';

       test('does nothing', async ({}, testInfo) => {
       });
     `,
    "playwright.config.js": `
       module.exports = {
         reporter: [
           [
             require.resolve("allure-playwright/reporter"),
             {
               resultsDir: "./allure-results",
               testMode: true,
               environmentInfo: {
                 envVar1: "envVar1Value",
                 envVar2: "envVar2Value",
               },
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

  expect(envInfo).toEqual({
    envVar1: "envVar1Value",
    envVar2: "envVar2Value",
  });
});
