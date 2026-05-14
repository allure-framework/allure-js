import { AsyncLocalStorage } from "node:async_hooks";

import type { Task, Test } from "@vitest/runner";
import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { VitestTestRunner } from "vitest/runners";

import { allureVitestLegacyApi } from "./legacy.js";
import { ALLURE_VITEST_ASYNC_CONTEXT_KEY } from "./runtime.js";
import { existsInTestPlan } from "./utils.js";
import { VitestTestRuntime } from "./VitestTestRuntime.js";

const ALLURE_VITEST_RUNNER_PATCHED_KEY = Symbol.for("allure-vitest.runnerPatched");

type AllureVitestAsyncContext = {
  currentTaskStorage: AsyncLocalStorage<Test>;
  activeTasks: WeakSet<Test>;
};

type PatchedRunner = typeof VitestTestRunner.prototype & {
  [ALLURE_VITEST_RUNNER_PATCHED_KEY]?: true;
  onAfterRetryTask?: (test: Task, retryInfo: { retry: number; repeats: number }) => unknown;
};

const getAsyncContext = (): AllureVitestAsyncContext => {
  const holder = globalThis as unknown as Record<string, AllureVitestAsyncContext | undefined>;

  return (holder[ALLURE_VITEST_ASYNC_CONTEXT_KEY] ??= {
    currentTaskStorage: new AsyncLocalStorage<Test>(),
    activeTasks: new WeakSet<Test>(),
  });
};

const patchVitestRunner = () => {
  const prototype = VitestTestRunner.prototype as PatchedRunner;

  if (prototype[ALLURE_VITEST_RUNNER_PATCHED_KEY]) {
    return;
  }

  const originalOnBeforeRunTask = prototype.onBeforeRunTask;
  const originalOnAfterRetryTask = prototype.onAfterRetryTask;
  const originalOnAfterRunTask = prototype.onAfterRunTask;

  const releaseTask = (test: Task) => {
    getAsyncContext().activeTasks.delete(test as Test);
  };

  const releaseNonRunnableTask = (test: Task) => {
    if (test.mode !== "run" && test.mode !== "queued") {
      releaseTask(test);
    }
  };

  const releaseDynamicallySkippedTask = (test: Task) => {
    const result = (test as Test).result as { pending?: boolean; state?: string } | undefined;

    if (result?.pending || result?.state === "skip") {
      releaseTask(test);
    }
  };

  prototype.onBeforeRunTask = async function allureOnBeforeRunTask(test: Task) {
    const asyncContext = getAsyncContext();

    asyncContext.activeTasks.add(test as Test);
    asyncContext.currentTaskStorage.enterWith(test as Test);

    await originalOnBeforeRunTask.call(this, test);

    releaseNonRunnableTask(test);
  };

  prototype.onAfterRetryTask = function allureOnAfterRetryTask(test: Task, retryInfo) {
    try {
      return originalOnAfterRetryTask?.call(this, test, retryInfo);
    } finally {
      releaseDynamicallySkippedTask(test);
    }
  };

  prototype.onAfterRunTask = async function allureOnAfterRunTask(test: Task) {
    try {
      return await originalOnAfterRunTask.call(this, test);
    } finally {
      releaseTask(test);
    }
  };

  prototype[ALLURE_VITEST_RUNNER_PATCHED_KEY] = true;
};

patchVitestRunner();

beforeAll(() => {
  globalThis.allureTestPlan = parseTestPlan();
  setGlobalTestRuntime(new VitestTestRuntime());
});

afterAll(() => {
  globalThis.allureTestPlan = undefined;
});

beforeEach(({ task, skip }) => {
  (task as any).meta = {
    ...task.meta,
    vitestWorker: globalThis?.process?.env?.VITEST_POOL_ID,
  };

  if (!existsInTestPlan(task, globalThis.allureTestPlan)) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-ignore
  globalThis.allure = undefined;
});
