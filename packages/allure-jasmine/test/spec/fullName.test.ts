import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runJasmineInlineTest } from "../utils.js";

it("should include package name in fullName", async () => {
  const { tests } = await runJasmineInlineTest({
    "spec/test/sample.spec.js": `
      it("foo", () => {});
    `,
  });

  expect(tests).toHaveLength(1);
  const test = tests[0];

  expect(test.fullName).toBe("dummy:spec/test/sample.spec.js#foo");
  expect(test.testCaseId).toBe(md5("dummy:spec/test/sample.spec.js#foo"));
  expect(test.labels).toContainEqual({
    name: "_fallbackTestCaseId",
    value: md5("spec/test/sample.spec.js#foo"),
  });
});
