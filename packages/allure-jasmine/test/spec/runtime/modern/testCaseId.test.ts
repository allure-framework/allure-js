import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils.js";

it("sets testCaseId", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    const { testCaseId } = require("allure-js-commons");

    it("testCaseId", async () => {
      await testCaseId("foo");
    })
  `,
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
