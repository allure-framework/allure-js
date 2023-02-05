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

    const selectedTests = testPlan.tests.map((testInfo) => {
      const pattern = testInfo.selector.replace("#", " ");
      return new RegExp(pattern);
    });

    // eslint-disable-next-line no-console
    console.log(
      `Allure: selective launch from testplan.json file is enabled with ${selectedTests.length} tests`,
    );

    return selectedTests;
  } catch (e) {
    return undefined;
  }
};
