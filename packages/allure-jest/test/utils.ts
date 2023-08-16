import fs from "fs";
import { cwd } from "process";
import { runCLI } from "@jest/core";
import type { Config } from "@jest/types";
import type { TestResult } from "allure-js-commons";
import { match, stub } from "sinon";

/**
 * Runs given jest tests (fixtures) with real jest runner and returns
 * allure test results
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
export const runJestTests = async (fixtures: string[]): Promise<TestResult[]> => {
  const argv: Config.Argv = {
    config: require.resolve("./jest.config"),
    collectCoverage: false,
    verbose: false,
    silent: true,
    $0: "",
    _: fixtures,
  };
  const writeFileSpy = stub(fs, "writeFileSync")
    .withArgs(match("allure-results"))
    .returns(undefined);

  await runCLI(argv, [cwd()]);

  return writeFileSpy.args.map(([, rawResult]) => JSON.parse(rawResult as string) as TestResult);
};
