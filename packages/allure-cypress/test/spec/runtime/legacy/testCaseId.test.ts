import { expect, it } from "vitest";
import { runCypressInlineTest } from "../../../utils.js";

it("testCaseId", async () => {
  const { tests } = await runCypressInlineTest(
    ({ allureCypressModulePath }) => `
    import { testCaseId } from "${allureCypressModulePath}";

    it("sample", () => {
      testCaseId("foo");
    });
  `,
  );

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
