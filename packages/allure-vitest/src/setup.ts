import { type TaskContext, afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { TestPlanV1, parseTestPlan } from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { bindAllureApi } from "./index.js";

const existsInTestPlan = (ctx: TaskContext, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const {
    name: testName,
    file: { name: testFileName },
  } = ctx.task;

  return testPlan.tests.some(({ selector }) => {
    const splittedSelector = selector.split("#");
    const selectorMatched = splittedSelector[0] === testFileName && splittedSelector[1] === testName;

    return selectorMatched;
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
    await allureAPI.label(ALLURE_SKIPPED_BY_TEST_PLAN_LABEL, "true");
    ctx.skip();
    return;
  }

  // @ts-ignore
  global.allure = allureAPI;
});

afterEach(() => {
  // @ts-ignore
  global.allure = undefined;
});
