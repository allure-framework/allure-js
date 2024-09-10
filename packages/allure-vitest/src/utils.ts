import { relative } from "node:path";
import { cwd } from "node:process";
import type { Suite, Task } from "vitest";
import { LabelName } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, includedInTestPlan } from "allure-js-commons/sdk/reporter";

export const getSuitePath = (task: Task): string[] => {
  const path = [];
  let currentSuite: Suite | undefined = task.suite;

  while (currentSuite) {
    // root suite has no name and shouldn't be included to the path
    if (!currentSuite.name) {
      break;
    }

    path.unshift(currentSuite.name);
    currentSuite = currentSuite.suite;
  }

  return path;
};

export const getTestMetadata = (task: Task) => {
  const suitePath = getSuitePath(task);
  const relativeTestPath = getPosixPath(relative(cwd(), task.file!.filepath));

  const { cleanTitle, labels } = extractMetadataFromString(task.name);

  return {
    specPath: relativeTestPath,
    name: cleanTitle || task.name,
    suitePath,
    fullName: `${relativeTestPath}#${suitePath.concat(cleanTitle).join(" ")}`,
    labels,
  };
};

export const existsInTestPlan = (task: Task, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const { fullName, labels } = getTestMetadata(task);
  const { value: id } = labels.find(({ name }) => name === LabelName.ALLURE_ID) ?? {};
  return includedInTestPlan(testPlan, { fullName, id });
};
