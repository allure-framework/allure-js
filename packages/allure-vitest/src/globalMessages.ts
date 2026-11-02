import type { RuntimeMessage } from "allure-js-commons/sdk";

// Kept apart from runtime.ts: the reporter loads it in the main process, where older Vitest
// versions throw on importing "vitest" outside a worker
export const ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY = "__allureVitestGlobalRuntimeMessages";

export const addGlobalMessage = (message: RuntimeMessage) => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const messages = (holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ??= []);

  messages.push(message);
};

export const takeGlobalRuntimeMessages = (): RuntimeMessage[] => {
  const holder = globalThis as unknown as Record<string, RuntimeMessage[] | undefined>;
  const result = [...(holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] ?? [])];

  holder[ALLURE_VITEST_GLOBAL_RUNTIME_MESSAGES_KEY] = [];

  return result;
};
