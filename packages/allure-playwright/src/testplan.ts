import { escapeRegExp, parseTestPlan } from "allure-js-commons/sdk/reporter";

export const testPlanFilter = () => {
  const testPlan = parseTestPlan();
  if (!testPlan) {
    return undefined;
  }

  return testPlan.tests
    .flatMap((testInfo) => (testInfo.selector ? [testInfo.selector] : []))
    .map((selector) => {
      const pattern = selector.replace("#", " ");
      return new RegExp(`\\s${escapeRegExp(pattern)}$`);
    });
};
