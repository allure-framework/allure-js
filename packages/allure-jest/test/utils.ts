import fs from "fs";
import { cwd } from "process";
import { runCLI } from "@jest/core";
import type { Config } from "@jest/types";
import type { TestResult } from "allure-js-commons";
import { match, restore, stub } from "sinon";

export type TestResultsByFullName = Record<string, TestResult>;

/**
 * Runs given jest tests (fixtures) with real jest runner and returns
 * mapped allure test results by test name
 *
 * @example
 * ```js
 * import { runJestTests } from "./test/utils"
 *
 * // path should be relative to `./test` directory in the project
 * const res = await runJestTests(["./fixtures/myTest.test.js"])
 * ```
 * @param fixtures Paths of fixtures should be tested
 */
export const runJestTests = async (fixtures: string[]): Promise<TestResultsByFullName> => {
  const argv: Config.Argv = {
    config: require.resolve("./jest.config"),
    collectCoverage: false,
    reporters: [],
    $0: "",
    _: fixtures,
  };
  const writeFileSpy = stub(fs, "writeFileSync")
    .withArgs(match("allure-results"))
    .returns(undefined);

  const res = await runCLI(argv, [cwd()]);
  const failedTestInRuntime = res.results.testResults.find((test) => !!test.testExecError);

  restore();

  if (failedTestInRuntime) {
    throw failedTestInRuntime.testExecError;
  }

  return writeFileSpy.args.reduce((acc, [, rawResult]) => {
    const result = JSON.parse(rawResult as string) as TestResult;

    return Object.assign(acc, { [result.fullName!]: result });
  }, {});
};
