import { escapeRegExp, parseTestPlan } from "allure-js-commons/sdk/reporter";

export const testPlanFilter = (enableExcludedTests = false) => {
  const testPlan = parseTestPlan({ enableExcludedTests });
  if (!testPlan) {
    return undefined;
  }

  const filters = testPlan.tests
    .flatMap((testInfo) => (testInfo.selector ? [testInfo.selector] : []))
    .map((selector) => {
      const pattern = selector.replace("#", " ");
      return new RegExp(`\\s${escapeRegExp(pattern)}$`);
    });

  if (!enableExcludedTests) {
    return filters;
  }

  const excludedPatterns = (testPlan.excludedTests ?? []).flatMap(({ selector }) =>
    selector ? [escapeRegExp(selector.replace("#", " "))] : [],
  );
  if (excludedPatterns.length === 0) {
    return testPlan.tests.length === 0 ? undefined : filters;
  }

  const exclusionPrefix = `^(?![\\s\\S]*\\s(?:${excludedPatterns.join("|")})$)`;
  if (testPlan.tests.length === 0) {
    return [new RegExp(`${exclusionPrefix}[\\s\\S]*$`)];
  }

  return filters.map((filter) => new RegExp(`${exclusionPrefix}[\\s\\S]*${filter.source}`));
};
