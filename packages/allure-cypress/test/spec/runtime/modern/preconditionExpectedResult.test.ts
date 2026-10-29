import { expect, it } from "vitest";

import { runCypressInlineTest } from "../../../utils.js";

it("precondition and expected result", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { expectedResult, precondition } from "${allureCommonsModulePath}";

    it("markdown", () => {
      precondition("A registered user exists and is **signed out**.");
      expectedResult("The user is redirected to the **dashboard**.");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].precondition).toBe("A registered user exists and is **signed out**.");
  expect(tests[0].expectedResult).toBe("The user is redirected to the **dashboard**.");
  expect(tests[0]).not.toHaveProperty("preconditionHtml");
  expect(tests[0]).not.toHaveProperty("expectedResultHtml");
});

it("preconditionHtml and expectedResultHtml", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { expectedResultHtml, preconditionHtml } from "${allureCommonsModulePath}";

    it("html", () => {
      preconditionHtml("<p>A registered user exists and is <strong>signed out</strong>.</p>");
      expectedResultHtml("<p>The user is redirected to the <strong>dashboard</strong>.</p>");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].preconditionHtml).toBe("<p>A registered user exists and is <strong>signed out</strong>.</p>");
  expect(tests[0].expectedResultHtml).toBe("<p>The user is redirected to the <strong>dashboard</strong>.</p>");
  expect(tests[0]).not.toHaveProperty("precondition");
  expect(tests[0]).not.toHaveProperty("expectedResult");
});
