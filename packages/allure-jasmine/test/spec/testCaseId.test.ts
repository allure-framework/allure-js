import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../utils";

it("sets testCaseId", async () => {
  const { tests } = await runJasmineInlineTest(`
    const { testCaseId } = require("allure-js-commons/new");

    it("testCaseId", async () => {
      await testCaseId("foo");
    })
  `);

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});