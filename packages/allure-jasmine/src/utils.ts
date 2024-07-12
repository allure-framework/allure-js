import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import type { TestPlanIndex } from "./model.js";

import FailedExpectation = jasmine.FailedExpectation;

export const findAnyError = (expectations?: FailedExpectation[]): FailedExpectation | null => {
  expectations = expectations || [];
  if (expectations.length > 0) {
    return expectations[0];
  }
  return null;
};

export const findMessageAboutThrow = (expectations?: FailedExpectation[]) => {
  return expectations?.find((e) => e.matcherName === "");
};

export const last = <T>(arr: readonly T[]) => (arr.length ? arr[arr.length - 1] : undefined);

export const getIndexedTestPlan = (): TestPlanIndex | undefined => {
  const testplan = parseTestPlan();
  if (testplan) {
    return {
      ids: new Set(testplan.tests.filter((e) => e.id).map((e) => e.id!.toString())),
      fullNames: new Set(testplan.tests.filter((e) => e.selector).map((e) => e.selector!)),
    };
  }
};

export const applyTestPlan = (testplan: TestPlanIndex | undefined, fullName: string) => {
  if (testplan) {
    if (!testplan.fullNames.has(fullName)) {
      global.pending("Excluded by the test plan");
    }
  }
};
