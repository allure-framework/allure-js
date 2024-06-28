import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("displayName", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { displayName } from "${allureCypressModulePath}";

    it("sample", () => {
      displayName("foo");
    });
  `,
});

  expect(tests).toHaveLength(1);
  expect(tests[0].name).toBe("foo");
});
