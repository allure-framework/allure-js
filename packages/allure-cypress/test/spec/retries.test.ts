import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("handles tests retries", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it("failed", () => {
        cy.wrap(1).should("eq", 2);
      });
    `,
    "cypress.config.js": ({ allureCypressModuleBasePath }) => `
      const { allureCypress } = require("${allureCypressModuleBasePath}/reporter.js");

      module.exports = {
        e2e: {
          retries: {
            runMode: 2,
            openMode: 2,
          },
          testTimeout: 500,
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
              links: {
                issue: {
                  urlTemplate: "https://allurereport.org/issues/%s"
                },
                tms: {
                  urlTemplate: "https://allurereport.org/tasks/%s"
                },
              },
            });

            return config;
          },
        },
      };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].parameters).toContainEqual(
    expect.objectContaining({
      name: "Retry",
      value: "2",
    }),
  );
});
