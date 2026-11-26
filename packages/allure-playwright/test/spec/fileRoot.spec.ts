import { LabelName } from "allure-js-commons";
import { md5 } from "allure-js-commons/sdk/reporter";
import { expect, it } from "vitest";

import { runPlaywrightInlineTest } from "../utils.js";

const specFile = `
  import { test } from '@playwright/test';

  test.describe('suite', () => {
    test('login', async () => {});
  });
`;

const configWith = (reporterOptions: string, testDir: string) => `
  module.exports = {
    testDir: ${JSON.stringify(testDir)},
    reporter: [["allure-playwright", { resultsDir: "./allure-results", ${reporterOptions} }]],
    projects: [{ name: "project" }],
  };
`;

it("should make spec paths relative to fileRoot", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "src/features/login.spec.js": specFile,
    "playwright.config.js": configWith('fileRoot: "./src"', "."),
  });

  expect(tests).toHaveLength(1);

  const [test] = tests;

  expect(test.testCaseId).toBe(md5("allure-playwright:features/login.spec.js#suite login"));
  expect(test.titlePath).toEqual(["allure-playwright", "features", "login.spec.js", "suite"]);
  expect(test.labels).toEqual(
    expect.arrayContaining([
      { name: LabelName.PACKAGE, value: "allure-playwright.features.login.spec.js" },
      { name: LabelName.SUITE, value: "features/login.spec.js" },
      { name: "_fallbackTestCaseId", value: md5("features/login.spec.js#suite login") },
    ]),
  );
});

it("should use an absolute fileRoot as is", async () => {
  const { tests } = await runPlaywrightInlineTest({
    "src/features/login.spec.js": specFile,
    "playwright.config.js": configWith('fileRoot: require("node:path").join(__dirname, "src")', "."),
  });

  expect(tests).toHaveLength(1);
  expect(tests[0].labels).toEqual(
    expect.arrayContaining([
      { name: LabelName.PACKAGE, value: "allure-playwright.features.login.spec.js" },
      { name: LabelName.SUITE, value: "features/login.spec.js" },
    ]),
  );
});

it("should match the output of a testDir at fileRoot", async () => {
  const { tests: withFileRoot } = await runPlaywrightInlineTest({
    "src/features/login.spec.js": specFile,
    "playwright.config.js": configWith('fileRoot: "./src"', "."),
  });
  const { tests: withTestDir } = await runPlaywrightInlineTest({
    "src/features/login.spec.js": specFile,
    "playwright.config.js": configWith("", "./src"),
  });

  const pick = ({ testCaseId, titlePath, labels }: (typeof withFileRoot)[number]) => ({
    testCaseId,
    titlePath,
    labels: labels.filter(({ name }) => [LabelName.PACKAGE, LabelName.SUITE, "_fallbackTestCaseId"].includes(name)),
  });

  expect(withFileRoot.map(pick)).toEqual(withTestDir.map(pick));
});
