import { cwd } from "node:process";
import { type TaskContext, afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { LabelName, TestPlanV1, extractMetadataFromString, parseTestPlan } from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { bindAllureApi } from "./index.js";
import { getTestFullName } from "./utils.js";

const existsInTestPlan = (ctx: TaskContext, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const { name: testName } = ctx.task;
  const testFullName = getTestFullName(ctx.task, cwd());
  const { labels } = extractMetadataFromString(testName);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};

beforeAll(() => {
  global.allureTestPlan = parseTestPlan();
});

afterAll(() => {
  global.allureTestPlan = undefined;
});

beforeEach(async (ctx) => {
  const allureAPI = bindAllureApi(ctx.task);

  if (!existsInTestPlan(ctx, global.allureTestPlan as TestPlanV1)) {
    await allureAPI.label(ALLURE_SKIPPED_BY_TEST_PLAN_LABEL as string, "true");
    ctx.skip();
    return;
  }

  (ctx.task as any).meta = {
    ...ctx.task.meta,
    VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  };

  // @ts-ignore
  global.allure = allureAPI;
});

afterEach(() => {
  // @ts-ignore
  global.allure = undefined;
});
