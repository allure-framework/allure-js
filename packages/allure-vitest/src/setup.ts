/* eslint @typescript-eslint/require-await: off */
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import * as allure from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { TestPlanV1, getGlobalTestRuntime, parseTestPlan } from "allure-js-commons/sdk/node";
import { existsInTestPlan } from "./utils.js";
import { AllureVitestTestRuntime } from "./runtime.js";

beforeAll(() => {
  // @ts-ignore
  global.allureTestPlan = parseTestPlan();
});

afterAll(() => {
  // @ts-ignore
  global.allureTestPlan = undefined;
});

beforeEach(async (ctx) => {
  (ctx.task as any).meta = {
    ...ctx.task.meta,
    VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  };

  // @ts-ignore
  if (!existsInTestPlan(ctx, global.allureTestPlan as TestPlanV1)) {
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
  globalThis.allure = allure;
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
