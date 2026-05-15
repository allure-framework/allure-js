import type { VitestRunner, Test } from "@vitest/runner";
import type { SerializedConfig } from "vitest";
import * as vitest from "vitest";

import { getAsyncContext } from "./concurrentState.js";

type VitestRunnerCtor = new (config: SerializedConfig) => VitestRunner;

const resolveRunnerBaseClass = async (): Promise<VitestRunnerCtor> => {
  const customRunnerModulePath = vitest.inject("__allure_vitest_custom_runner_module__");
  if (customRunnerModulePath) {
    // The value comes from config.runner, which is always resolved to an absolute
    // or bare specifier
    const customRunnerCtor = (await import(customRunnerModulePath)).default;
    if (!customRunnerCtor && typeof customRunnerCtor !== "function") {
      throw new Error(
        `Runner must export a default function, but got ${typeof customRunnerCtor} imported from ${customRunnerModulePath}`,
      );
    }
    return customRunnerCtor;
  }

  if ("TestRunner" in vitest) {
    // Vitest 4.1+
    return vitest.TestRunner as VitestRunnerCtor;
  }

  // Vitest <=4.0
  const { VitestTestRunner } = await import("vitest/runners");
  return VitestTestRunner;
};

export default class ConcurrencyAwareAllureVitestRunner
  extends (await resolveRunnerBaseClass())
  implements VitestRunner
{
  constructor(config: SerializedConfig) {
    super(config);

    this.onBeforeRunTask = async (test: Test) => {
      const asyncContext = getAsyncContext();

      asyncContext.activeTasks.add(test as Test);
      asyncContext.currentTaskStorage.enterWith(test as Test);

      await super.onBeforeRunTask?.(test);

      this.#releaseNonRunnableTask(test);
    };

    this.onAfterRetryTask = (test: Test, options: { retry: number; repeats: number }) => {
      try {
        return super.onAfterRetryTask?.(test, options);
      } finally {
        this.#releaseDynamicallySkippedTask(test);
      }
    };

    this.onAfterRunTask = async (test: Test) => {
      try {
        return await super.onAfterRunTask?.(test);
      } finally {
        this.#releaseTask(test);
      }
    };
  }

  #releaseNonRunnableTask = (test: Test) => {
    if (test.mode !== "run" && test.mode !== "queued") {
      this.#releaseTask(test);
    }
  };

  #releaseTask = (test: Test) => {
    getAsyncContext().activeTasks.delete(test as Test);
  };

  #releaseDynamicallySkippedTask = (test: Test) => {
    const result = (test as Test).result as { pending?: boolean; state?: string } | undefined;

    if (result?.pending || result?.state === "skip") {
      this.#releaseTask(test);
    }
  };
}
