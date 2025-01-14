import { getCurrentSuite, getCurrentTest } from "@vitest/runner";
import type { SuiteCollector, RunnerTask as Task, TaskMeta } from "vitest";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class VitestTestRuntime extends MessageTestRuntime {
  sendMessage(message: RuntimeMessage): Promise<void> {
    const currentTest = getCurrentTest();
    if (currentTest) {
      addMessage(currentTest.meta, message);
      return Promise.resolve();
    }
    const currentSuite = getCurrentSuite();
    if (currentSuite) {
      currentSuite.tasks.forEach((task) => processTask(task, message));
      return Promise.resolve();
    }
    // eslint-disable-next-line no-console
    console.error(
      "no vitest context is detected. Please ensure you're using allure API within vitest test (it, test) " +
        "or setup (beforeAll, beforeEach, afterAll, afterEach) function. Make sure vitest@1.6.0 or above is used",
    );
    return Promise.resolve();
  }
}

const processTask = (task: Task | SuiteCollector, message: RuntimeMessage) => {
  switch (task.type) {
    case "collector":
    case "suite":
      task.tasks.forEach((sub) => processTask(sub, message));
      break;
    case "test":
      addMessage(task.meta, message);
      break;
    default:
      break;
  }
};

const addMessage = (meta: TaskMeta, message: RuntimeMessage) => {
  // @ts-ignore
  if (!meta.allureRuntimeMessages) {
    // @ts-ignore
    meta.allureRuntimeMessages = [];
  }
  // @ts-ignore
  meta.allureRuntimeMessages.push(message);
};
