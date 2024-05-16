import { escapeRegExp, parseTestPlan } from "allure-js-commons/sdk/node";

export const testPlanFilter = () => {
  const testPlan = parseTestPlan();
  if (!testPlan) {
    return undefined;
  }

  return testPlan.tests.map((testInfo) => {
    const pattern = testInfo.selector.replace("#", " ");
    return new RegExp(`\\s${escapeRegExp(pattern)}$`);
  });
};
