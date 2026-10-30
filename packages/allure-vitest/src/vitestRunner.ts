import type { RunnerTestCase as Test, SuiteCollector } from "vitest";
import * as vitest from "vitest";

type VitestRunnerApi = {
  getCurrentTest: () => Test | undefined;
  getCurrentSuite: () => SuiteCollector | undefined;
};

const resolveVitestRunnerApi = async (): Promise<VitestRunnerApi> => {
  // Vitest 4.1+ exposes the runner state on TestRunner. Vitest 5 bundles the runner and no longer
  // depends on @vitest/runner, so a separately installed copy never sees the current test.
  const testRunner = (vitest as { TestRunner?: Partial<VitestRunnerApi> }).TestRunner;

  if (typeof testRunner?.getCurrentTest === "function" && typeof testRunner.getCurrentSuite === "function") {
    return {
      getCurrentTest: () => testRunner.getCurrentTest!(),
      getCurrentSuite: () => testRunner.getCurrentSuite!(),
    };
  }

  // Vitest <4.1; the specifier is kept out of Vite's static analysis since @vitest/runner is an optional peer
  const runnerModulePath = "@vitest/runner";

  try {
    const { getCurrentTest, getCurrentSuite } = (await import(/* @vite-ignore */ runnerModulePath)) as VitestRunnerApi;

    return { getCurrentTest, getCurrentSuite };
  } catch (cause) {
    throw new Error("allure-vitest requires @vitest/runner matching the vitest version with Vitest older than 4.1", {
      cause,
    });
  }
};

export const { getCurrentTest, getCurrentSuite } = await resolveVitestRunnerApi();
