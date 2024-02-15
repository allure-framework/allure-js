import { relative } from "node:path";
import { Suite, Task } from "vitest";

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
  const relativeTestPath = relative(rootDir, task.file.filepath);

  return `${relativeTestPath}#${suitePath.concat(task.name).join(" ")}`;
};
