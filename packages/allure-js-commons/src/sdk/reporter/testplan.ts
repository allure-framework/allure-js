import { readFileSync } from "node:fs";
import type { TestPlanV1 } from "../types.js";

export const parseTestPlan = (): TestPlanV1 | undefined => {
  const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;

  if (!testPlanPath) {
    return undefined;
  }

  try {
    const file = readFileSync(testPlanPath, "utf8");
    const testPlan = JSON.parse(file) as TestPlanV1;

    // Execute all tests if test plan is empty
    if ((testPlan.tests || []).length === 0) {
      return undefined;
    }

    return testPlan;
  } catch (e) {
    return undefined;
  }
};
