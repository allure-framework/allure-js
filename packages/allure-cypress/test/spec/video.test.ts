import { expect, it } from "vitest";
import { ContentType } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("attaches same video to each spec in a test", async () => {
  const { tests, groups } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("foo", () => {});

      it("bar", () => {});
    `,
    "cypress.config.js": () =>
      `
      const { allureCypress } = require("allure-cypress/reporter");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          video: true,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
              links: [
                {
                  type: "issue",
                  urlTemplate: "https://allurereport.org/issues/%s"
                },
                {
                  type: "tms",
                  urlTemplate: "https://allurereport.org/tasks/%s"
                },
              ]
            });

            return config;
          },
        },
      };
    `,
  });

  expect(tests).toHaveLength(2);
  expect(groups).toHaveLength(1);
  expect(groups[0]).toEqual(
    expect.objectContaining({
      name: "Cypress video",
      children: expect.arrayContaining([tests[0].uuid, tests[1].uuid]),
      afters: [
        expect.objectContaining({
          name: "Cypress video",
          attachments: [
            expect.objectContaining({
              name: "Cypress video",
              type: ContentType.MP4,
            }),
          ],
        }),
      ],
    }),
  );
});
