import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { afterAll, afterEach, beforeAll, beforeEach } from "vitest";

import { getCurrentTest } from "./concurrentState.js";
import { allureVitestLegacyApi } from "./legacy.js";
import { registerAllureVitestExpect } from "./matchers.js";
import { setGetCurrentTest } from "./runtime.js";
import { existsInTestPlan } from "./utils.js";
import { VitestTestRuntime } from "./VitestTestRuntime.js";

setGetCurrentTest(getCurrentTest);
registerAllureVitestExpect();

beforeAll(() => {
  globalThis.allureTestPlan = parseTestPlan();
  setGlobalTestRuntime(new VitestTestRuntime());
});

afterAll(() => {
  globalThis.allureTestPlan = undefined;
});

beforeEach(({ task, skip }) => {
  (task as any).meta = {
    ...task.meta,
    vitestWorker: globalThis?.process?.env?.VITEST_POOL_ID,
  };

  if (!existsInTestPlan(task, globalThis.allureTestPlan)) {
    task.meta.allureSkip = true;
    skip();
    return;
  }

  globalThis.allure = allureVitestLegacyApi;
});

afterEach(() => {
  // @ts-ignore
  globalThis.allure = undefined;
});
