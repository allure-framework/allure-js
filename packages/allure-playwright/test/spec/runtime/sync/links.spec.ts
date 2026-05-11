import { LinkType } from "allure-js-commons";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../../../utils.js";

it("sets runtime links through the sync facade", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "sample.test.js": `
      import { test } from "@playwright/test";
      import { issue, link, links, tms } from "allure-js-commons/sync";

      test("should add links", async () => {
        link("https://playwright.dev/docs/api/class-page#page-workers");
        issue("1");
        issue("https://example.org/issues/2");
        tms("1");
        tms("https://example.org/tasks/2");
        links(...[{ url: "https://www.google.com/1" }, { url: "https://www.google.com/2" }]);
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

  expect(tests).toEqual([
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
