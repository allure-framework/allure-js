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
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
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
  });

  expect(tests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "passing",
        status: Status.PASSED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "skipped-1",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
      }),
      expect.objectContaining({
        name: "skipped-2",
        status: Status.SKIPPED,
        stage: Stage.FINISHED,
      }),
    ]),
  );
});
