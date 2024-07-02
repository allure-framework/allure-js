import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("has environment info", async () => {
  const { envInfo } = await runPlaywrightInlineTest({
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
