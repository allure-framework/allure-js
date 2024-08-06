import { relative } from "node:path";
import { cwd } from "node:process";
import type { Suite, Task } from "vitest";
import { LabelName } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";

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

export const getTestFullName = (task: Task, rootDir: string): string => {
  const suitePath = getSuitePath(task);
  const relativeTestPath = relative(rootDir, task.file!.filepath);

  return `${relativeTestPath}#${suitePath.concat(task.name).join(" ")}`;
};

export const existsInTestPlan = (task: Task, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const { name: testName } = task;
  const testFullName = getTestFullName(task, cwd());
  const { labels } = extractMetadataFromString(testName);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};
