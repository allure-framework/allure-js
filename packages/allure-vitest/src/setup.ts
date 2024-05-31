import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL, parseTestPlan } from "allure-js-commons/sdk/reporter";
import {
  MessageHolderTestRuntime,
  getGlobalTestRuntimeWithAutoconfig,
  setGlobalTestRuntime,
} from "allure-js-commons/sdk/runtime";
import { allureVitestLegacyApi } from "./legacy.js";
import { existsInTestPlan } from "./utils.js";

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

  setGlobalTestRuntime(new MessageHolderTestRuntime());
});

afterEach(async (ctx) => {
  // @ts-ignore
  // eslint-disable-next-line
  const globalTestRuntime: MessageHolderTestRuntime = await getGlobalTestRuntimeWithAutoconfig();
  // @ts-ignore
  ctx.task.meta.allureRuntimeMessages = [...globalTestRuntime.messages()];
  // @ts-ignore
  globalThis.allure = undefined;
});
