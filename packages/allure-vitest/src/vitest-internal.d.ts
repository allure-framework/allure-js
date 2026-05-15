import "vitest";
import type { RuntimeMessage, TestPlanV1 } from "allure-js-commons/sdk";

declare global {
  var allureTestPlan: TestPlanV1 | undefined;
}

declare module "vitest" {
  interface ProvidedContext {
    __allure_vitest_custom_runner_module__?: string;
  }

  interface TaskMeta {
    vitestWorker?: string;
    browser?: string;
    allureSkip?: boolean;
    allureRuntimeMessages?: RuntimeMessage[];
    allureGlobalRuntimeMessages?: RuntimeMessage[];
  }
}
