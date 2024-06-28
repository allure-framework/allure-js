import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("testCaseId", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCommonsModulePath }) => `
    import { testCaseId } from "${allureCommonsModulePath}";

    it("sample", () => {
      testCaseId("foo");
    });
  `,
});

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
