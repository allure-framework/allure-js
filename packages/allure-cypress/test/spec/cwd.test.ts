import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils.js";

it("should not depend on a CWD when no Cypress config provided", async () => {
  const { tests } = await runCypressInlineTest(
    {
      "package.json": () => JSON.stringify({ name: "dummy" }),
      "cypress.config.js": ({ allureCypressReporterModulePath, supportFilePath, specPattern, allureDirPath }) => `
        const { allureCypress } = require("${allureCypressReporterModulePath}");

        module.exports = {
          e2e: {
            baseUrl: "https://allurereport.org",
            supportFile: "${supportFilePath}",
            specPattern: "${specPattern}",
            viewportWidth: 1240,
            setupNodeEvents: (on, config) => {
              allureCypress(on, {
                resultsDir: "${allureDirPath}",
              });

              return config;
            },
          },
        };
      `,
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {});
      `,
    },
    {
      cwd: "cypress",
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([{ name: "package", value: "dummy.cypress.e2e.sample.cy.js" }]),
  );
  expect(tests[0].fullName).toEqual("dummy:cypress/e2e/sample.cy.js#foo");
});
