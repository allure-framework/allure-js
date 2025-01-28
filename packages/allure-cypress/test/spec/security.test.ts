import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("shouldn't break the flow when access storage after the page reload", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.visit("https://allurereport.org");
      cy.clearLocalStorage();
      cy.wait(200);
      cy.reload();
      cy.wait(200);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});
