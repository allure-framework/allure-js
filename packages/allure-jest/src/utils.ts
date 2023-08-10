import type { Circus } from "@jest/types";

export const getFullPath = (test: Circus.TestEntry | Circus.DescribeBlock): string[] => {
  const path = [];
  let currentUnit: Circus.DescribeBlock | Circus.TestEntry | undefined = test;

  while (currentUnit) {
    if (currentUnit.name === "ROOT_DESCRIBE_BLOCK") {
      break;
    }

    if (currentUnit.name) {
      path.unshift(currentUnit.name);
    }

    currentUnit = currentUnit.parent;
  }

  return path;
};

// TODO: reuse getFullPath
export const getSuitePath = (test: Circus.TestEntry): string[] => {
  const path = [];
  let currentSuite: Circus.DescribeBlock | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.name === "ROOT_DESCRIBE_BLOCK") {
      break;
    }

    if (currentSuite.name) {
      path.unshift(currentSuite.name);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};
