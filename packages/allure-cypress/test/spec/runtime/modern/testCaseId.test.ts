import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("testCaseId", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { testCaseId } from "${allureCypressModulePath}";

    it("sample", () => {
      testCaseId("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
