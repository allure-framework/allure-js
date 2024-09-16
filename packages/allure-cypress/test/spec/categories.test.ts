import { expect, it } from "vitest";
import { Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("has categories", async () => {
  const { categories } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
      it('sample test', () => {});
    `,
    "cypress.config.js": ({ allureCypressReporterModulePath }) => `
      const { allureCypress } = require("${allureCypressReporterModulePath}");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          setupNodeEvents: (on, config) => {
            allureCypress(on, {
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
               ]
            });

            return config;
          },
        },
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
