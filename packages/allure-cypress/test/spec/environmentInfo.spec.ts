import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils.js";

it("has environment info", async () => {
  const { envInfo } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it('sample test', () => {});
     `,
    "cypress.config.js": ({ allureCypressModuleBasePath }) => `
      const { allureCypress } = require("${allureCypressModuleBasePath}/reporter.js");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
              environmentInfo: {
                envVar1: "envVar1Value",
                envVar2: "envVar2Value",
              },
            });

            return config;
          },
        },
      };
    `,
  });

  expect(envInfo).toEqual({
    envVar1: "envVar1Value",
    envVar2: "envVar2Value",
  });
});
