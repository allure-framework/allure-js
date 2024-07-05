import type { Circus } from "@jest/types";
import { LabelName } from "allure-js-commons";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import type { TestPlanV1 } from "allure-js-commons/sdk";

/**
 * Returns array of names which represents full test hierarchy
 * Omits ROOT_DESCRIBE_BLOCK because it shouldn't be reported
 *
 * @param test Test or describe block
 * @returns
 */
export const getTestPath = (test: Circus.TestEntry | Circus.DescribeBlock): string[] => {
  const path = [];
  let currentUnit: Circus.DescribeBlock | Circus.TestEntry | undefined = test;

  while (currentUnit) {
    if (currentUnit.name) {
      path.unshift(currentUnit.name);
    }

    currentUnit = currentUnit.parent;
  }

  // debugger

  // first element is always ROOT_DESCRIBE_BLOCK, which shouldn't be reported
  return path.slice(1);
};

/**
 * Returns starndartized test name what can be used as test Id
 *
 * @doc https://github.com/jestjs/jest/blob/25a8785584c9d54a05887001ee7f498d489a5441/packages/jest-circus/src/utils.ts#L410
 * @param path Path memebers
 * @returns
 */
export const getTestId = (path: string[]): string => path.join(" ");

/**
 * Returns test full name (test hierarchy joined by " > ")
 *
 * @param path Path memebers
 * @returns
 */
export const getTestFullName = (path: string[]): string => path.join(" > ");

const jestHookPattern = /^at jestAdapter/i;
// A slightly different reference should be used to identify jestAdapter's global hook in some older versions of Jest.
const jestHookLegacyPattern = /jest-circus\/build\/legacy-code-todo-rewrite\/jestAdapter.js:\d+:\d+$/;

export const shouldHookBeSkipped = (hook: Circus.Hook): boolean => {
  // In older versions of Jest the hook's stack is direcrly in asyncError. In newer ones - in asyncError.stack.
  const stackOrError: string | Error | undefined = hook?.asyncError;
  const stack = typeof stackOrError === "string" ? stackOrError : stackOrError?.stack;
  const errorFirstLine = stack?.split("\n")?.[1]?.trim() || "";

  return jestHookPattern.test(errorFirstLine) || jestHookLegacyPattern.test(errorFirstLine);
};

export const last = <T>(array: T[]): T => array[array.length - 1];

export const isTestPresentInTestPlan = (testFullName: string, testPlan: TestPlanV1) => {
  const { labels } = extractMetadataFromString(testFullName);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};
