import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
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
  expect(tests[0].titlePath).toEqual(["dummy", "cypress", "e2e", "foo", "bar", "sample.cy.js"]);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5("cypress/e2e/foo/bar/sample.cy.js#should pass"),
      },
    ]),
  );
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
  expect(tests[0].titlePath).toEqual(["dummy", "cypress", "e2e", "foo", "bar", "sample.cy.js", "foo", "bar"]);
});
