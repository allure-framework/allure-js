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

beforeEach((ctx) => {
  (ctx.task as any).meta = {
    ...ctx.task.meta,
    VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  };

  // @ts-ignore
  if (!existsInTestPlan(ctx, globalThis.allureTestPlan as TestPlanV1)) {
    // @ts-ignore
    ctx.task.meta.allureSkip = true;
    ctx.skip();
    return;
  }

  // @ts-ignore
  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-ignore
  globalThis.allure = undefined;
});
