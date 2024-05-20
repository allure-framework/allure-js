import { relative } from "node:path";
import { cwd } from "node:process";
import { Suite, Task, type TaskContext } from "vitest";
import { LabelName, TestPlanV1, extractMetadataFromString } from "allure-js-commons/sdk/node";

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

export const existsInTestPlan = (ctx: TaskContext, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const { name: testName } = ctx.task;
  const testFullName = getTestFullName(ctx.task, cwd());
  const { labels } = extractMetadataFromString(testName);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};
