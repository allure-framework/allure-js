import { expect, it } from "vitest";
import { md5 } from "allure-js-commons/sdk/reporter";
import { runMochaInlineTest } from "../utils.js";

it("should include package name in fullName for unique test identification", async () => {
  const { tests } = await runMochaInlineTest(["plain-mocha", "testInFileScope"]);

  expect(tests).toHaveLength(1);
  const test = tests[0];

  const fullName = test.fullName as string;
  expect(fullName).toMatch(
    /^allure-mocha:test\/fixtures\/[a-f0-9-]+\/plain-mocha\/testInFileScope\.spec\.(c|m)?js: a test in a file scope$/,
  );

  const fullNameBase = fullName.split(": a test in a file scope")[0];
  expect(test.testCaseId).toBe(md5(JSON.stringify([fullNameBase, "a test in a file scope"])));
  const legacyFullNameBase = fullNameBase.replace(/^allure-mocha:/, "");
  expect(test.labels).toEqual(
    expect.arrayContaining([
      {
        name: "_fallbackTestCaseId",
        value: md5(JSON.stringify([legacyFullNameBase, "a test in a file scope"])),
      },
    ]),
  );
  expect(test.historyId).toBeDefined();
  expect(test.historyId).toMatch(/^[a-f0-9:]+$/);
});

it("should generate unique testCaseId based on fullName with package prefix", async () => {
  const { tests } = await runMochaInlineTest(["plain-mocha", "testInSuite"]);

  expect(tests).toHaveLength(1);
  const test = tests[0];

  const fullName = test.fullName as string;
  expect(fullName).toMatch(
    /^allure-mocha:test\/fixtures\/[a-f0-9-]+\/plain-mocha\/testInSuite\.spec\.(c|m)?js: foo > a test in a suite$/,
  );
  const fullNameBase = fullName.split(": foo > a test in a suite")[0];
  expect(test.testCaseId).toBe(md5(JSON.stringify([fullNameBase, "foo", "a test in a suite"])));
});
