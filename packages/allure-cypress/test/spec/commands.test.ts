import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("test with cypress command", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it("with commands", () => {
      cy.log(1);
      cy.log("2");
      cy.log([1, 2, 3]);
      cy.log({ foo: 1, bar: 2, baz: 3 });
    });
  `,
  );

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
            name: String.raw`Argument "0"`,
            value: JSON.stringify(1, null, 2),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument "0"`,
            value: "2",
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument "0"`,
            value: JSON.stringify([1, 2, 3], null, 2),
          }),
        ]),
      }),
      expect.objectContaining({
        name: String.raw`Command "log"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: String.raw`Argument "0"`,
            value: JSON.stringify({ foo: 1, bar: 2, baz: 3 }, null, 2),
          }),
        ]),
      }),
    ]),
  );
});
