import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { VitestTestRuntime } from "./VitestTestRuntime.js";
import { allureVitestLegacyApi } from "./legacy.js";
import { existsInTestPlan } from "./utils.js";

beforeAll(() => {
  // @ts-ignore
  globalThis.allureTestPlan = parseTestPlan();
  setGlobalTestRuntime(new VitestTestRuntime());
});

afterAll(() => {
  // @ts-ignore
  globalThis.allureTestPlan = undefined;
});

beforeEach(({ task, skip }) => {
  (task as any).meta = {
    ...task.meta,
    VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  };

  // @ts-ignore
  if (!existsInTestPlan(task, globalThis.allureTestPlan as TestPlanV1)) {
    // @ts-ignore
    task.meta.allureSkip = true;
    skip();
    return;
  }

  // @ts-ignore
  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-ignore
  globalThis.allure = undefined;
});
