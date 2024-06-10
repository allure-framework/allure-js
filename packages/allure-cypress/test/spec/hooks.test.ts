import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("handles hooks", async () => {
  const { tests, groups } = await runCypressInlineTest(
    () => `
    before(() => {
      console.log("before all");
    });

    beforeEach(() => {
      console.log("before");
    });

    afterEach(() => {
      console.log("after");
    });

    after(() => {
      console.log("after all");
    });

    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  );

  debugger

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});
