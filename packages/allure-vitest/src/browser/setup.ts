import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
/* eslint no-underscore-dangle: "off" */
import { afterEach, beforeAll, beforeEach } from "vitest";
import { commands } from "vitest/browser";

import { allureVitestLegacyApi } from "../legacy.js";
import { registerAllureVitestExpect } from "../matchers.js";
import type { AllureVitestCurrentAttempt } from "../vitest-artifacts.js";
import { VitestBrowserTestRuntime } from "../VitestBrowserTestRuntime.js";

registerAllureVitestExpect();

beforeAll(() => {
  setGlobalTestRuntime(new VitestBrowserTestRuntime());
});

beforeEach(async ({ onTestFinished, skip, task }) => {
  const attemptStartTime = Date.now();
  const artifacts = "artifacts" in task ? task.artifacts : undefined;
  const previousAttempt = task.meta.allureCurrentAttempt;

  // A retry starts only after all callbacks and teardown of the previous attempt have completed.
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
    retryCount: task.result?.retryCount ?? 0,
    repeatCount: task.result?.repeatCount ?? 0,
    errorOffset: task.result?.errors?.length ?? 0,
    artifactStart: artifacts?.length ?? 0,
  };

  Object.assign(task.meta, {
    // @ts-expect-error
    vitestWorker: globalThis?.__vitest_worker__?.ctx?.workerId,
    browser: task.file.projectName,
    allureCurrentAttempt: attempt,
  });

  const inTestPlan = (await commands?.existsInTestPlan?.(task)) ?? true;

  if (!inTestPlan) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  onTestFinished(() => {
    // Vitest calls onTestFinished after afterEach and before onTestFailed.
    attempt.duration = Date.now() - attemptStartTime;
  });

  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-expect-error
  globalThis.allure = undefined;
});
