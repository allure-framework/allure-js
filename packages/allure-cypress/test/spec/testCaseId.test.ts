import { expect, it } from "vitest";
import { runCypressInlineTest } from "../utils";

it("testCaseId", async () => {
  const { tests } = await runCypressInlineTest(`
    import { testCaseId } from "allure-cypress";

    it("sample", () => {
      testCaseId("foo");
    });
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});