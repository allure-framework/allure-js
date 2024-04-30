import { expect, it } from "vitest";
import { Stage, Status } from "allure-js-commons";
import { runCypressInlineTest } from "../utils";

it("passed test", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it("passed", () => {
      cy.wrap(1).should("eq", 1);
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.PASSED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("failed test", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it("failed", () => {
      cy.wrap(1).should("eq", 2);
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.FAILED);
  expect(tests[0].stage).toBe(Stage.FINISHED);
});

it("broken test", async () => {
  const { tests } = await runCypressInlineTest(
    () => `
    it("broken", () => {
      throw new Error("broken");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].status).toBe(Status.BROKEN);
  expect(tests[0].stage).toBe(Stage.FINISHED);
  expect(tests[0].statusDetails).toHaveProperty("message", "broken");
});
