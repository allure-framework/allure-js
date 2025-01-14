import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils.js";

it("should handle global labels", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
    "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
      const { allureCypress } = require("${allureCypressReporterModulePath}");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          supportFile: "${supportFilePath}",
          specPattern: "${specPattern}",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, config, {
              resultsDir: "${allureDirPath}",
              globalLabels: [
                {
                  name: "foo",
                  value: "bar"
                }
              ]
            });

            return config;
          },
        },
      };
    `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels[0]).toEqual({
    name: "foo",
    value: "bar",
  });
});
