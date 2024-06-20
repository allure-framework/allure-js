import { expect, it } from "vitest";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets runtime links", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test, allure } from 'allure-playwright';

      test('should add links', async ({}, testInfo) => {
        await allure.link("custom", "https://playwright.dev/docs/api/class-page#page-workers");
        await allure.issue("issue 1", "1");
        await allure.issue("issue 2", "https://example.org/issues/2");
        await allure.tms("task 1", "1");
        await allure.tms("task 2", "https://example.org/tasks/2");
        await allure.links(...[{ url:"https://www.google.com/1" }, { url:"https://www.google.com/2" }]);
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
               links: {
                 issue: {
                   urlTemplate: "https://example.org/issues/%s",
                 },
                 tms: {
                   urlTemplate: "https://example.org/tasks/%s",
                 }
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

  expect(results.tests).toEqual([
    expect.objectContaining({
      links: [
        {
          url: "https://playwright.dev/docs/api/class-page#page-workers",
          type: "custom",
        },
        {
          url: "https://example.org/issues/1",
          type: "issue",
          name: "issue 1",
        },
        {
          url: "https://example.org/issues/2",
          type: "issue",
          name: "issue 2",
        },
        {
          url: "https://example.org/tasks/1",
          type: "tms",
          name: "task 1",
        },
        {
          url: "https://example.org/tasks/2",
          type: "tms",
          name: "task 2",
        },
        {
          url: "https://www.google.com/1",
        },
        {
          url: "https://www.google.com/2",
        },
      ],
    }),
  ]);
});
