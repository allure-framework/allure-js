import type { Circus } from "@jest/types";

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

  // first element is always ROOT_DESCRIBE_BLOCK, which shouldn't be reported
  return path.slice(1);
};

/**
 * Returns starndartized test name what can be used as test ID
 *
 * @doc https://github.com/jestjs/jest/blob/25a8785584c9d54a05887001ee7f498d489a5441/packages/jest-circus/src/utils.ts#L410
 * @param path Path memebers
 * @returns
 */
export const getTestID = (path: string[]): string => path.join(" ");

/**
 * Returns test full name (test hierarchy joined by " > ")
 *
 * @param path Path memebers
 * @returns
 */
export const getTestFullName = (path: string[]): string => path.join(" > ");
