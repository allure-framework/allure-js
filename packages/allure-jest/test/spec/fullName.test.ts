import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runJestInlineTest } from "../utils.js";

it("should include package name in fullName for unique test identification", async () => {
  const { tests } = await runJestInlineTest({
    "sample.spec.js": `
      it("sample test", () => {
        expect(true).toBe(true);
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const test = tests[0];

  const expectedFullName = "allure-jest:sample.spec.js#sample test";
  expect(test.fullName).toBe(expectedFullName);
  expect(test.testCaseId).toBe(md5(expectedFullName));
  expect(test.labels).toContainEqual({
    name: "_fallbackTestCaseId",
    value: md5("sample.spec.js#sample test"),
  });

  // testCaseId is deterministic, so historyId is also deterministic
  const expectedHistoryId = `${md5(expectedFullName)}:${md5("")}`;
  expect(test.historyId).toBe(expectedHistoryId);
});

it("should generate unique testCaseId based on fullName with package prefix", async () => {
  const { tests } = await runJestInlineTest({
    "nested/user.spec.js": `
      describe("User", () => {
        it("should create user", () => {
          expect(true).toBe(true);
        });
      });
    `,
  });

  expect(tests).toHaveLength(1);
  const test = tests[0];

  const expectedFullName = "allure-jest:nested/user.spec.js#User should create user";
  expect(test.fullName).toBe(expectedFullName);
  expect(test.testCaseId).toBe(md5(expectedFullName));
});
