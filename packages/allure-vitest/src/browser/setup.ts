import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
/* eslint no-underscore-dangle: "off" */
import { afterEach, beforeAll, beforeEach } from "vitest";
import { commands } from "vitest/browser";

import { allureVitestLegacyApi } from "../legacy.js";
import { registerAllureVitestExpect } from "../matchers.js";
import { VitestBrowserTestRuntime } from "../VitestBrowserTestRuntime.js";

registerAllureVitestExpect();

beforeAll(() => {
  setGlobalTestRuntime(new VitestBrowserTestRuntime());
});

beforeEach(async ({ onTestFailed, onTestFinished, skip, task }) => {
  const attemptStartTime = Date.now();
  const attemptErrorOffset = task.result?.errors?.length ?? 0;

  (task as any).meta = {
    ...task.meta,
    // @ts-expect-error
    vitestWorker: globalThis?.__vitest_worker__?.ctx?.workerId,
    browser: task.file.projectName,
    allureAttemptStartTime: attemptStartTime,
    allureAttemptDuration: undefined,
  };

  const inTestPlan = (await commands?.existsInTestPlan?.(task)) ?? true;

  if (!inTestPlan) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  onTestFinished(({ task }) => {
    task.meta.allureAttemptDuration = Date.now() - attemptStartTime;
  });

  onTestFailed(async ({ task }) => {
    const errors = task.result?.errors?.slice(attemptErrorOffset);

    task.meta.allureFailedAttempts ??= [];
    task.meta.allureFailedAttempts.push({
      result: task.result
        ? {
            ...task.result,
            startTime: attemptStartTime,
            duration: task.meta.allureAttemptDuration ?? Date.now() - attemptStartTime,
            errors: errors?.length ? errors : undefined,
          }
        : undefined,
      runtimeMessages: task.meta.allureRuntimeMessages ? [...task.meta.allureRuntimeMessages] : [],
      artifacts: task.artifacts ? [...task.artifacts] : [],
    });

    task.meta.allureRuntimeMessages = [];
    // Vitest keeps browser artifacts on the task across retries, so clear them after snapshotting the attempt.
    task.artifacts.length = 0;
  });

  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-expect-error
  globalThis.allure = undefined;
});
