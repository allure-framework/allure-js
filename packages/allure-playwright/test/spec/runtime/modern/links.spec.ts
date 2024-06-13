import { expect, it } from "vitest";
import { LinkType } from "allure-js-commons";
import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets runtime links", async () => {
  const results = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from '@playwright/test';
      import { link, links, issue, tms } from 'allure-js-commons';

      test('should add epic link', async ({}, testInfo) => {
        await link("https://playwright.dev/docs/api/class-page#page-workers");
        await issue("1");
        await issue("https://example.org/issues/2");
        await tms("1");
        await tms("https://example.org/tasks/2");
        await links(...[{ url:"https://www.google.com/1" }, { url:"https://www.google.com/2" }]);
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
                 ${LinkType.ISSUE}: {
                   urlTemplate: "https://example.org/issues/%s",
                 },
                 ${LinkType.TMS}: {
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
        },
        {
          url: "https://example.org/issues/1",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/issues/2",
          type: LinkType.ISSUE,
        },
        {
          url: "https://example.org/tasks/1",
          type: LinkType.TMS,
        },
        {
          url: "https://example.org/tasks/2",
          type: LinkType.TMS,
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
