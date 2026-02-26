import { afterEach, beforeAll, beforeEach } from "vitest";
import { commands } from "vitest/browser";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { VitestTestRuntime } from "../VitestTestRuntime.js";
import { allureVitestLegacyApi } from "../legacy.js";

beforeAll(async () => {
  setGlobalTestRuntime(new VitestTestRuntime());
});

beforeEach(async ({ skip, task }) => {
  (task as any).meta = {
    ...task.meta,
    // @ts-expect-error
    vitestWorker: globalThis?.["__vitest_worker__"]?.ctx?.workerId,
  };

  const inTestPlan = (await commands?.existsInTestPlan?.(task)) ?? true;

  if (!inTestPlan) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-expect-error
  globalThis.allure = undefined;
});
