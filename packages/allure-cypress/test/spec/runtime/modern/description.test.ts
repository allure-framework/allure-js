import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("description", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { description } from "${allureCypressModulePath}";

    it("markdown", () => {
      description("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].description).toBe("foo");
});

it("descriptionHtml", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { descriptionHtml } from "${allureCypressModulePath}";

    it("html", () => {
      descriptionHtml("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
