import { describe, expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runCypressInlineTest } from "../utils.js";

describe("fullName and package", () => {
  it("should include package name in fullName", async () => {
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/sample.cy.js": () => `
        it("foo", () => {});
      `,
    });

    expect(tests).toHaveLength(1);
    const test = tests[0];

    expect(test.fullName).toEqual("dummy:cypress/e2e/sample.cy.js#foo");
    expect(test.testCaseId).toBe(md5("dummy:cypress/e2e/sample.cy.js#foo"));
    expect(test.labels).toContainEqual({
      name: "_fallbackTestCaseId",
      value: md5("cypress/e2e/sample.cy.js#foo"),
    });
  });

  it("should generate correct fullName for nested describes", async () => {
    const { tests } = await runCypressInlineTest({
      "cypress/e2e/nested.cy.js": () => `
        describe("suite 1", () => {
          describe("suite 2", () => {
            it("test in nested suite", () => {});
          });
        });
      `,
    });

    expect(tests).toHaveLength(1);
    expect(tests[0].fullName).toEqual("dummy:cypress/e2e/nested.cy.js#suite 1 suite 2 test in nested suite");
  });
});
