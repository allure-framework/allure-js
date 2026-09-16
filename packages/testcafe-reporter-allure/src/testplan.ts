import type { TestPlanV1 } from "allure-js-commons/sdk";
import { parseTestPlan } from "allure-js-commons/sdk/reporter";

import {
  getEffectiveAllureId,
  getRelativeFixtureSelector,
  mergeFixtureAndTestMeta,
  normalizeMeta,
  resolveTestPlan,
} from "./utils.js";

export type CreateAllureTestPlanFilterOptions = {
  cwd?: string;
};

const splitSelector = (selector: string) => {
  const parts = selector.split("#");
  const testName = parts.pop() ?? "";
  const fixtureName = parts.pop() ?? "";
  const fixturePath = parts.join("#");

  return {
    fixturePath,
    fixtureName,
    testName,
  };
};

const selectorsMatch = (planSelector: string, actualSelector: string) => {
  if (planSelector === actualSelector) {
    return true;
  }

  const planned = splitSelector(planSelector);
  const actual = splitSelector(actualSelector);

  if (planned.fixtureName !== actual.fixtureName || planned.testName !== actual.testName) {
    return false;
  }

  return (
    actual.fixturePath.endsWith(`/${planned.fixturePath}`) ||
    planned.fixturePath.endsWith(`/${actual.fixturePath}`) ||
    actual.fixturePath === planned.fixturePath
  );
};

const isIncludedInPlan = (testPlan: TestPlanV1, selector: string, allureId?: string) =>
  testPlan.tests.some(
    (test) =>
      (typeof test.selector === "string" && selectorsMatch(test.selector, selector)) ||
      (allureId && test.id !== undefined && String(test.id) === allureId),
  );

export const createAllureTestPlanFilter = ({ cwd }: CreateAllureTestPlanFilterOptions = {}) => {
  const testPlan = cwd ? resolveTestPlan(cwd) : parseTestPlan();

  if (!testPlan) {
    return undefined;
  }

  return (
    testName: string,
    fixtureName: string,
    fixturePath: string,
    testMeta: Record<string, unknown>,
    fixtureMeta: Record<string, unknown>,
  ) => {
    const mergedMeta = mergeFixtureAndTestMeta(normalizeMeta(fixtureMeta), normalizeMeta(testMeta));
    const selector = getRelativeFixtureSelector(fixturePath, fixtureName, testName);
    const allureId = getEffectiveAllureId(mergedMeta, testName);

    return isIncludedInPlan(testPlan, selector, allureId);
  };
};
