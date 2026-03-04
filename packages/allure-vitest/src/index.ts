/* eslint no-var: "off" */
import { type TestPlanV1 } from "allure-js-commons/sdk";
import type { AllureVitestLegacyApi } from "./legacy.js";

declare global {
  var allure: AllureVitestLegacyApi;
  var allureTestPlan: TestPlanV1 | undefined;
}

declare module "vitest" {
  interface TaskMeta {
    vitestWorker?: string;
    browser?: string;
    allureSkip?: boolean;
  }
}
