import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("works with the reporter instance", async () => {
  const { tests } = await runCypressInlineTest(
    `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
    (testDir) => `
      const { AllureCypress } = require("allure-cypress/reporter");

      module.exports = {
        e2e: {
          baseUrl: "https://allurereport.org",
          viewportWidth: 1240,
          video: true,
          setupNodeEvents: (on, config) => {
            const allureCypress = new AllureCypress(on);

            allureCypress.attachToCypress(on, config);

            on("after:spec", (spec, result) => {
              allureCypress.endSpec(spec, result);
            });

            return config;
          },
        },
      };
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});
