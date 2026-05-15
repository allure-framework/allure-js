import { AsyncLocalStorage } from "node:async_hooks";

import { type Test, getCurrentTest as getCurrentTestGlobal } from "@vitest/runner";

type AllureAwareGlobalThis = { __allureVitestAsyncContext?: AllureVitestAsyncContext };

type AllureVitestAsyncContext = {
  currentTaskStorage: AsyncLocalStorage<Test>;
  activeTasks: WeakSet<Test>;
};

export const getAsyncContext = () => {
  const holder = globalThis as unknown as AllureAwareGlobalThis;

  return (holder.__allureVitestAsyncContext ??= {
    currentTaskStorage: new AsyncLocalStorage<Test>(),
    activeTasks: new WeakSet<Test>(),
  });
};

export const getCurrentTest = () => {
  const holder = globalThis as unknown as AllureAwareGlobalThis;
  const asyncContext = holder.__allureVitestAsyncContext;
  const task = asyncContext?.currentTaskStorage.getStore();

  if (task) {
    return (asyncContext?.activeTasks?.has(task) ?? true) ? task : undefined;
  }

  return getCurrentTestGlobal();
};
