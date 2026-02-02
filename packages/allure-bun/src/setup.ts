import { beforeAll, beforeEach, afterEach, afterAll } from "bun:test";
import * as allure from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { BunTestRuntime } from "./BunTestRuntime.js";
import { generateTestId } from "./utils.js";

const bunTestRuntime = new BunTestRuntime();

let testPlan: TestPlanV1 | undefined;

beforeAll(() => {
  testPlan = parseTestPlan();
  setGlobalTestRuntime(bunTestRuntime);

globalThis.allure = allure;
globalThis.allureTestPlan = testPlan;
globalThis.allureRuntime = bunTestRuntime;
});

beforeEach(() => {
  const currentTest = (globalThis as any).__bunCurrentTest;

  if (currentTest) {
    const testId = generateTestId({
      name: currentTest.name || "unknown",
      file: currentTest.file || "unknown",
      state: "pass",
    });

    bunTestRuntime.setCurrentTest(testId);

    if (!currentTest.meta) {
      currentTest.meta = {};
    }
    currentTest.meta.allureTestId = testId;
  }
});

afterEach(() => {
  const currentTest = (globalThis as any).__bunCurrentTest;

  if (currentTest?.meta?.allureTestId) {
    const testId = currentTest.meta.allureTestId;
    const messages = bunTestRuntime.getMessages(testId);

    if (!currentTest.meta.allureRuntimeMessages) {
      currentTest.meta.allureRuntimeMessages = [];
    }
    currentTest.meta.allureRuntimeMessages.push(...messages);

    bunTestRuntime.clearMessages(testId);
  }
});

afterAll(() => {
  bunTestRuntime.clearAll();

delete globalThis.allure;
delete globalThis.allureTestPlan;
delete globalThis.allureRuntime;
});