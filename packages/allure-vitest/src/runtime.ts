import { type SuiteCollector, type Task, getCurrentSuite, getCurrentTest } from "@vitest/runner";
import type { TaskMeta } from "vitest";
import { type RuntimeMessage, isGlobalRuntimeMessage } from "allure-js-commons/sdk";
import { BaseMessageTestRuntime } from "allure-js-commons/sdk/runtime";

export const ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY = "__allureVitestGlobalRuntimeMessages";

export const ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY = "allureGlobalRuntimeMessages";

export const ALLURE_VITEST_RUNTIME_MESSAGES_META_KEY = "allureRuntimeMessages";

export type RuntimeMessageMetaKey =
  | typeof ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY
  | typeof ALLURE_VITEST_RUNTIME_MESSAGES_META_KEY;

export type RuntimeMessageTaskMeta = TaskMeta & {
  [ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY]?: RuntimeMessage[];
  [ALLURE_VITEST_RUNTIME_MESSAGES_META_KEY]?: RuntimeMessage[];
};

export const addGlobalMessage = (message: RuntimeMessage) => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const messages = (holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ??= []);

  messages.push(message);
};

export const addMessageToMeta = (meta: TaskMeta, key: RuntimeMessageMetaKey, message: RuntimeMessage) => {
  const typedMeta = meta as RuntimeMessageTaskMeta;
  const messages = (typedMeta[key] ??= []);

  messages.push(message);
};

export const takeGlobalRuntimeMessages = (): RuntimeMessage[] => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const result = [...(holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ?? [])];

  holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] = [];

  return result;
};

export const processTask = (task: Task | SuiteCollector, message: RuntimeMessage, isGlobal = false) => {
  switch (task.type) {
    case "collector":
    case "suite":
      task.tasks.forEach((sub) => processTask(sub, message, isGlobal));
      break;
    case "test":
      if (isGlobal) {
        addMessageToMeta(task.meta, ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY, message);
      } else {
        addMessage(task.meta, message);
      }
      break;
    default:
      break;
  }
};

// beforeAll is suite-scoped in Vitest (no current test context):
// https://main.vitest.dev/api/hooks#beforeall
// Bind a global message to the first test task to avoid duplicating it across every
// test in the suite when suite-level globals are later collected.
export const attachGlobalMessageToFirstTest = (task: Task | SuiteCollector, message: RuntimeMessage): boolean => {
  switch (task.type) {
    case "collector":
    case "suite":
      return task.tasks.some((sub) => attachGlobalMessageToFirstTest(sub, message));
    case "test":
      addMessageToMeta(task.meta, ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY, message);
      return true;
    default:
      return false;
  }
};

export const addMessage = (meta: TaskMeta, message: RuntimeMessage) => {
  addMessageToMeta(meta, ALLURE_VITEST_RUNTIME_MESSAGES_META_KEY, message);
};

export class BaseVitestTestRuntime extends BaseMessageTestRuntime {
  sendMessage(message: RuntimeMessage): Promise<void> {
    const currentTest = getCurrentTest();

    if (isGlobalRuntimeMessage(message)) {
      if (currentTest) {
        addMessageToMeta(currentTest.meta, ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_META_KEY, message);
        return Promise.resolve();
      }

      try {
        const currentSuite = getCurrentSuite();

        if (currentSuite) {
          const hasTargetTest = attachGlobalMessageToFirstTest(currentSuite, message);
          if (hasTargetTest) {
            return Promise.resolve();
          }
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
        processTask(currentSuite, message);
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
