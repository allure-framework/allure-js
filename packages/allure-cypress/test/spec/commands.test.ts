import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils.js";

it("test with cypress command", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it("with command", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].steps).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        status: Status.PASSED,
        stage: Stage.FINISHED,
        name: String.raw`Command "wrap"`,
        parameters: expect.arrayContaining([
          expect.objectContaining({
            name: "Arguments",
            value: JSON.stringify(["1"], null, 2),
          }),
        ]),
      }),
    ]),
  );
});
