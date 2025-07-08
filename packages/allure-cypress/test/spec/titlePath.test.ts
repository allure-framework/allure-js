import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils.js";

it("should assign titlePath property to the test result", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/foo/bar/sample.cy.js": () => `
      it("should pass", () => {
        cy.wrap(1).should("eq", 1);
      });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].titlePath).toEqual(["cypress", "e2e", "foo", "bar", "sample.cy.js"]);
});

it("should assign titlePath property to the test result with suites", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/foo/bar/sample.cy.js": () => `
      describe("foo", () => {
        describe("bar", () => {
          it("should pass", () => {
            cy.wrap(1).should("eq", 1);
          });
        });
      });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].titlePath).toEqual(["cypress", "e2e", "foo", "bar", "sample.cy.js", "foo", "bar"]);
});
