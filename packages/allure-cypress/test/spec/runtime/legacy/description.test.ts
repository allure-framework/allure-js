import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("description", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { description } from "${allureCommonsModulePath}";

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
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { descriptionHtml } from "${allureCommonsModulePath}";

    it("html", () => {
      descriptionHtml("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].descriptionHtml).toBe("foo");
});
