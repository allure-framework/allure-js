import { readFileSync } from "node:fs";

interface TestPlan {
  version: string;
  tests: {
    id: number;
    selector: string;
  }[];
}

export const testPlanFilter = () => {
  try {
    const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;

    if (!testPlanPath) {
      return undefined;
    }

    const file = readFileSync(testPlanPath, "utf8");
    const testPlan = JSON.parse(file) as TestPlan;

    if ((testPlan.tests || []).length === 0) {
      return undefined;
    }

    const selectedTests = testPlan.tests.map((testInfo) => {
      const pattern = testInfo.selector.replace("#", " ");
      return new RegExp(pattern);
    });

    return selectedTests;
  } catch (e) {
    return undefined;
  }
};
