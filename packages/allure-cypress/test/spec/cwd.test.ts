import path from "node:path";
import { describe, expect, it } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { runCypressInlineTest } from "../utils.js";

describe("fullName, and package", () => {
  describe("with testplan", () => {
    it("should not depend on a CWD", async () => {
      const testPlan: TestPlanV1 = {
        version: "1.0",
        tests: [{ selector: "cypress/e2e/sample.cy.js#foo" }],
      };
      const { tests } = await runCypressInlineTest(
        {
          "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {});
      `,
          "testplan.json": () => JSON.stringify(testPlan),
        },
        {
          cwd: "cypress",
          env: (testDir) => ({ ALLURE_TESTPLAN_PATH: path.join(testDir, "testplan.json") }),
        },
      );

      expect(tests).toHaveLength(1);
      expect(tests[0].labels).toEqual(expect.arrayContaining([{ name: "package", value: "cypress.e2e.sample.cy.js" }]));
      expect(tests[0].fullName).toEqual("cypress/e2e/sample.cy.js#foo");
    });
  });

  describe("when no Cypress config provided", () => {
    it("should not depend on a CWD", async () => {
      const { tests } = await runCypressInlineTest(
        {
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
      expect(tests[0].labels).toEqual(expect.arrayContaining([{ name: "package", value: "cypress.e2e.sample.cy.js" }]));
      expect(tests[0].fullName).toEqual("cypress/e2e/sample.cy.js#foo");
    });
  });
});
