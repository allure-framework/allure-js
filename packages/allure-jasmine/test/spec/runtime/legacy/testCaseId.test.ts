import { resolve } from "node:path";
import { expect, it } from "vitest";
import { runJasmineInlineTest } from "../../../utils";

it("sets testCaseId", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
    const { testCaseId } = require("allure-js-commons");

    it("testCaseId", async () => {
      await testCaseId("foo");
    })
  `,
    "spec/helpers/allure.js": require(resolve(__dirname, "../../../fixtures/spec/helpers/legacy/allure.cjs")),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].testCaseId).toBe("foo");
});
