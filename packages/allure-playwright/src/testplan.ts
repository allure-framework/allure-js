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
    const file = readFileSync("testplan.json", "utf8");
    const testPlan = JSON.parse(file) as TestPlan;

    if ((testPlan.tests || []).length === 0) {
      return undefined;
    }

    return testPlan.tests.map((testInfo) => {
      const pattern = testInfo.selector.replace("#", " ");
      return new RegExp(pattern);
    });
  } catch (e) {
    return undefined;
  }
};
