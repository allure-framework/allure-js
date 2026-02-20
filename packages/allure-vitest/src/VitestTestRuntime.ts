import { getCurrentSuite, getCurrentTest } from "@vitest/runner";
import type { SuiteCollector, RunnerTask as Task, TaskMeta } from "vitest";
import { type RuntimeMessage, isGlobalRuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

const ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY = "__allureVitestGlobalRuntimeMessages";
const ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY = "allureGlobalRuntimeMessages";

const addGlobalMessage = (message: RuntimeMessage) => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const messages = (holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ??= []);
  messages.push(message);
};

const addGlobalMessageToMeta = (meta: TaskMeta, message: RuntimeMessage) => {
  // @ts-ignore
  if (!meta[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY]) {
    // @ts-ignore
    meta[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY] = [];
  }
  // @ts-ignore
  meta[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY].push(message);
};

export const takeGlobalRuntimeMessages = (): RuntimeMessage[] => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const result = [...(holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ?? [])];
  holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] = [];
  return result;
};

export class VitestTestRuntime extends MessageTestRuntime {
  sendMessage(message: RuntimeMessage): Promise<void> {
    const currentTest = getCurrentTest();

    if (isGlobalRuntimeMessage(message)) {
      if (currentTest) {
        addGlobalMessageToMeta(currentTest.meta, message);
        return Promise.resolve();
      }

      try {
        const currentSuite = getCurrentSuite();

        if (currentSuite) {
          // @ts-ignore
          currentSuite.tasks.forEach((task) => processTask(task, message, true));
          return Promise.resolve();
        }
      } catch {}

      addGlobalMessage(message);
      return Promise.resolve();
    }

    if (currentTest) {
      addMessage(currentTest.meta, message);

      return Promise.resolve();
    }

    try {
      const currentSuite = getCurrentSuite();

      if (currentSuite) {
        // @ts-ignore
        currentSuite.tasks.forEach((task) => processTask(task, message));
        return Promise.resolve();
      }
    } catch {}

    // eslint-disable-next-line no-console
    console.error(
      "no vitest context is detected. Please ensure you're using allure API within vitest test (it, test) " +
        "or setup (beforeAll, beforeEach, afterAll, afterEach) function. Make sure vitest@1.6.0 or above is used",
    );

    return Promise.resolve();
  }
}

const processTask = (task: Task | SuiteCollector, message: RuntimeMessage, isGlobal = false) => {
  switch (task.type) {
    case "collector":
    case "suite":
      task.tasks.forEach((sub) => processTask(sub, message, isGlobal));
      break;
    case "test":
      if (isGlobal) {
        addGlobalMessageToMeta(task.meta, message);
      } else {
        addMessage(task.meta, message);
      }
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
