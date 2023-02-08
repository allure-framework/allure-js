import { escapeRegExp, parseTestPlan } from "allure-js-commons";

export interface TestPlanFile {
  version: string;
  tests: {
    id: number;
    selector: string;
  }[];
}

export const testPlanFilter = () => {
  const testPlan = parseTestPlan();
  if (!testPlan) {
    return undefined;
  }

  const selectedTests = testPlan.tests.map((testInfo) => {
    const pattern = testInfo.selector.replace("#", " ");
    return new RegExp(escapeRegExp(pattern));
  });

  return selectedTests;
};
