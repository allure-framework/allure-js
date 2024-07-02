import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../utils.js";

it("has categories", async () => {
  const { categories } = await runPlaywrightInlineTest({
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
               categories: [
                 {
                   name: "Sad tests",
                   messageRegex: ".*Sad.*",
                   matchedStatuses: ["${Status.FAILED}"],
                 },
                 {
                   name: "Infrastructure problems",
                   messageRegex: ".*RuntimeException.*",
                   matchedStatuses: ["${Status.BROKEN}"],
                 },
                 {
                   name: "Outdated tests",
                   messageRegex: ".*FileNotFound.*",
                   matchedStatuses: ["${Status.BROKEN}"],
                 },
                 {
                   name: "Regression",
                   messageRegex: "${String.raw`.*\\sException:.*`}",
                   matchedStatuses: ["${Status.BROKEN}"],
                 },
               ],
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

  expect(categories).toEqual([
    {
      name: "Sad tests",
      messageRegex: ".*Sad.*",
      matchedStatuses: [Status.FAILED],
    },
    {
      name: "Infrastructure problems",
      messageRegex: ".*RuntimeException.*",
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: "Outdated tests",
      messageRegex: ".*FileNotFound.*",
      matchedStatuses: [Status.BROKEN],
    },
    {
      name: "Regression",
      messageRegex: ".*\\sException:.*",
      matchedStatuses: [Status.BROKEN],
    },
  ]);
});
