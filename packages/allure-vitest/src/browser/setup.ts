import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
/* eslint no-underscore-dangle: "off" */
import type { RunnerTestCase } from "vitest";
import * as vitest from "vitest";
import { commands } from "vitest/browser";

import { allureVitestLegacyApi } from "../legacy.js";
import { registerAllureVitestExpect } from "../matchers.js";
import type { AllureVitestCurrentAttempt } from "../vitest-artifacts.js";
import { VitestBrowserTestRuntime } from "../VitestBrowserTestRuntime.js";

registerAllureVitestExpect();

vitest.beforeAll(() => {
  setGlobalTestRuntime(new VitestBrowserTestRuntime());
});

const startAttempt = (task: RunnerTestCase) => {
  const attemptStartTime = Date.now();
  const artifacts = "artifacts" in task ? task.artifacts : undefined;
  const previousAttempt = task.meta.allureCurrentAttempt;
  const runnerRetryCount = task.result?.retryCount ?? 0;
  // aroundEach starts before Vitest updates repeatCount. Its retryCount is cumulative across repeats.
  const repeatCount = previousAttempt
    ? previousAttempt.repeatCount + Number(runnerRetryCount === previousAttempt.runnerRetryCount)
    : (task.result?.repeatCount ?? 0);

  // The next attempt starts only after all callbacks and teardown of the previous attempt have completed.
  // Keep Vitest's artifacts intact: only store the range belonging to this attempt.
  if (previousAttempt && task.result) {
    task.meta.allureAttempts ??= [];
    task.meta.allureAttempts.push({
      result: {
        ...task.result,
        state: task.result.state === "run" ? "fail" : task.result.state,
        startTime: previousAttempt.startTime,
        duration: previousAttempt.duration ?? 0,
        retryCount: previousAttempt.retryCount,
        repeatCount: previousAttempt.repeatCount,
        errors: task.result.errors?.slice(previousAttempt.errorOffset),
      },
      runtimeMessages: task.meta.allureRuntimeMessages ?? [],
      artifactStart: previousAttempt.artifactStart,
      artifactEnd: artifacts?.length ?? 0,
    });
    task.meta.allureRuntimeMessages = [];
  }

  const attempt: AllureVitestCurrentAttempt = {
    startTime: attemptStartTime,
    runnerRetryCount,
    retryCount: previousAttempt?.repeatCount === repeatCount ? previousAttempt.retryCount + 1 : 0,
    repeatCount,
    errorOffset: task.result?.errors?.length ?? 0,
    artifactStart: artifacts?.length ?? 0,
  };

  Object.assign(task.meta, {
    // @ts-expect-error
    vitestWorker: globalThis?.__vitest_worker__?.ctx?.workerId,
    browser: task.file.projectName,
    allureCurrentAttempt: attempt,
  });

  return attempt;
};

vitest.aroundEach(async (run, { task }) => {
  const attempt = startAttempt(task);
  try {
    await run();
  } finally {
    attempt.duration = Date.now() - attempt.startTime;
  }
});

// Vitest 5 generates the commands object before the reporter registers its commands
const existsInTestPlan = async (task: RunnerTestCase): Promise<boolean | undefined> => {
  if (commands?.existsInTestPlan) {
    return await commands.existsInTestPlan(task);
  }

  // @ts-expect-error
  return await globalThis.__vitest_browser_runner__?.commands?.triggerCommand?.("existsInTestPlan", [task]);
};

vitest.beforeEach(async ({ skip, task }) => {
  const inTestPlan = (await existsInTestPlan(task)) ?? true;

  if (!inTestPlan) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  globalThis.allure = allureVitestLegacyApi;
});

vitest.afterEach(() => {
  // @ts-expect-error
  globalThis.allure = undefined;
});
