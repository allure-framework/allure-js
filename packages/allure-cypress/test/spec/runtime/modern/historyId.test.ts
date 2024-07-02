import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("historyId", async () => {
  const { tests } = await runCypressInlineTest({
    "cypress/e2e/sample.cy.js": ({ allureCypressModulePath }) => `
    import { historyId } from "${allureCypressModulePath}";

    it("sample", () => {
      historyId("foo");
    });
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].historyId).toBe("foo");
});
