import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("should add host & thread labels", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "host",
        value: expect.any(String),
      },
      {
        name: "thread",
        value: expect.any(String),
      },
    ]),
  );
});

it("should add package label", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([{ name: "package", value: "dummy.cypress.e2e.sample.cy.js" }]),
  );
});

it("should add labels from env variables", async () => {
  const { tests } = await runCypressInlineTest(
    {
      "cypress/e2e/sample.cy.js": () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
    },
    {
      env: () => ({
        ALLURE_LABEL_A: "a",
        ALLURE_LABEL_B: "b",
      }),
    },
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: "A", value: "a" },
      { name: "B", value: "b" },
    ]),
  );
});
