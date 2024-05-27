import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { TestPlanV1, getGlobalTestRuntime, parseTestPlan } from "allure-js-commons/sdk/node";
import { existsInTestPlan } from "./utils.js";
import { AllureVitestTestRuntime } from "./runtime.js";
import { allureVitestLegacyApi } from "./legacy.js";

beforeAll(() => {
  // @ts-ignore
  globalThis.allureTestPlan = parseTestPlan();
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
    ctx.task.meta.allureRuntimeMessages = [
      {
        type: "metadata",
        data: {
          labels: [{ name: ALLURE_SKIPPED_BY_TEST_PLAN_LABEL, value: "true" }],
        },
      },
    ];
    ctx.skip();
    return;
  }

  // @ts-ignore
  globalThis.allure = allureVitestLegacyApi;
});

afterEach(async (ctx) => {
  // @ts-ignore
  // eslint-disable-next-line
  const globalTestRuntime: AllureVitestTestRuntime = await getGlobalTestRuntime();
  // @ts-ignore
  ctx.task.meta.allureRuntimeMessages = [...globalTestRuntime.messagesHolder];
  // @ts-ignore
  globalThis.allure = undefined;
});
