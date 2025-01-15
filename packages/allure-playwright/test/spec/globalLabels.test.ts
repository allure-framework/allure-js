import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../utils.js";

it("should handle global labels", async () => {
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
                 globalLabels: {
                   foo: "bar",
                   bar: ["beep", "boop"],
                 }
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
  expect(tests[0].labels).toEqual(expect.arrayContaining([
    {
      name: "foo",
      value: "bar",
    },
    {
      name: "bar",
      value: "beep",
    },
    {
      name: "bar",
      value: "boop",
    },
  ]));
});
