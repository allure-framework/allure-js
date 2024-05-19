import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("passed test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("failed test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("failed", () => {
      cy.wrap(1).should("eq", 2);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("broken test", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("broken", () => {
      throw new Error("broken");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].statusDetails).toHaveProperty("message", "broken");
});

it("skipped tests", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it.skip("skipped-1", () => {
      cy.wrap(1).should("eq", 1);
    });
    it("passing", () => {
      cy.wrap(1).should("eq", 1);
    });
    it.skip("skipped-2", () => {
      cy.wrap(2).should("eq", 2);
    });
  `,
  );

  expect(tests).toHaveLength(3);
  // The passing test is first, because afterEach hook runs before after hook
  expect(tests[0].status).toBe(Status.PASSING);
  expect(tests[0].stage).toBe(Stage.FINISHED);

  expect(tests[1].status).toBe(Status.SKIPPED);
  expect(tests[1].stage).toBe(Stage.FINISHED);
  expect(tests[2].status).toBe(Status.SKIPPED);
  expect(tests[2].stage).toBe(Stage.FINISHED);
});
