import { readFileSync } from "fs";
import { env } from "process";
import { IConfiguration } from "@cucumber/cucumber/lib/configuration";

type TestPlanEntry = {
  id: string | number;
  selector: string;
};

type TestPlan = {
  version: string;
  tests: TestPlanEntry[];
};

/**
 * Loads tests from the test plan file to the given cucumber.js configuration
 *
 * @example
 * ```js
 * // cjs version
 * module.exports = {
 *   default: createTestPlanFilter({
 *     parallel: 2,
 *     format: './formatter.js'
 *   })
 * }
 *
 * // esm version
 * export default createTestPlanFilter({
 *   parallel: 2,
 *   format: './formatter.js'
 * })
 * ```
 * @param config the cucumber.js configuration
 * @returns enchanced cucumber.js configuration with filter by selectors from the test plan
 */
export const createTestPlanFilter = (config: Partial<IConfiguration>): Partial<IConfiguration> => {
  const { ALLURE_TESTPLAN_PATH = "" } = env;

  if (!ALLURE_TESTPLAN_PATH) {
    return config;
  }

  let specFilters = [];

  try {
  	const rawTestplan = readFileSync(ALLURE_TESTPLAN_PATH, "utf8");
  	const { tests = [] }: TestPlan = JSON.parse(rawTestplan);

  	specFilters = tests.map(({ selector }) => selector);

    return {
      ...config,
      paths: (config.paths || []).concat(specFilters),
    };
  } catch (err: any) {
    // eslint-disable-next-line no-console
    console.error(`Test Plan hasn't been loaded, due the error:\n${err}`);

    return config;
  }
};
