import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("reports test with cypress command", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("with commands", () => {
      cy.log(1);
      cy.log("2");
      cy.log([1, 2, 3]);
      cy.log({ foo: 1, bar: 2, baz: 3 });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].steps).toHaveLength(4);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify(1, null, 2),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: "2",
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify([1, 2, 3], null, 2),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument [0]`,
            value: JSON.stringify({ foo: 1, bar: 2, baz: 3 }, null, 2),
          }),
        ]),
      }),
    ]),
  );
});

it("doesn't report cypress command when they shouldn't be reported", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": () => `
    it("with commands", () => {
      cy.log(1, { log: false });
      cy.log("2", { log: false });
      cy.log([1, 2, 3], { log: false });
      cy.log({ foo: 1, bar: 2, baz: 3 }, { log: false });
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].steps).toHaveLength(0);
});
