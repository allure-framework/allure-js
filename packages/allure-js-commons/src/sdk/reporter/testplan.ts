import { existsSync, readFileSync } from "node:fs";

import type { Label } from "../../model.js";
import type { TestPlanV1, TestPlanV1Test } from "../types.js";
import { allureIdRegexp } from "../utils.js";

export const parseTestPlan = (options: { enableExcludedTests?: boolean } = {}): TestPlanV1 | undefined => {
  const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;

  if (!testPlanPath) {
    return undefined;
  }

  if (!existsSync(testPlanPath)) {
    // eslint-disable-next-line no-console
    console.error("Test plan file is missing. Skipping test plan usage:", testPlanPath);
    return undefined;
  }

  try {
    const file = readFileSync(testPlanPath, "utf8");
    const testPlan = JSON.parse(file) as Partial<TestPlanV1> & { version?: string };

    if (testPlan.version !== "1.0") {
      // eslint-disable-next-line no-console
      console.error("Test plan version is unsupported. Skipping test plan usage:", testPlan.version);
      return undefined;
    }

    const hasExcludedTests =
      options.enableExcludedTests && Array.isArray(testPlan.excludedTests) && testPlan.excludedTests.length > 0;

    if (hasExcludedTests) {
      testPlan.tests ??= [];
    }

    // Execute all tests if test plan is empty
    if (!Array.isArray(testPlan.tests) || (testPlan.tests.length === 0 && !hasExcludedTests)) {
      return undefined;
    }

    return testPlan as TestPlanV1;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`could not parse test plan ${testPlanPath}`, e);
    return undefined;
  }
};

export const includedInTestPlan = (
  testPlan: TestPlanV1,
  subject: { allureId?: string; id?: string; fullName?: string; nativeSelector?: string; tags?: string[] },
  options: { enableExcludedTests?: boolean } = {},
): boolean => {
  const { allureId, id, fullName, nativeSelector, tags = [] } = subject;
  const effectiveId =
    allureId ??
    id ??
    tags.map((tag) => tag?.match(allureIdRegexp)?.groups?.id).find((maybeId) => maybeId !== undefined);

  const matchesTest = (test: TestPlanV1Test) => {
    const idMatched = effectiveId !== undefined && test.id !== undefined && String(test.id) === effectiveId;
    const selectorMatched = fullName !== undefined && test.selector === fullName;
    const nativeSelectorMatched = nativeSelector !== undefined && test.selector === nativeSelector;

    return idMatched || selectorMatched || nativeSelectorMatched;
  };

  if (testPlan.tests.length === 0 && testPlan.excludedTests?.length === 0) return true;

  const selected = testPlan.tests.length === 0 || testPlan.tests.some(matchesTest);
  if (!options.enableExcludedTests) return selected;

  return selected && !testPlan.excludedTests?.some(matchesTest);
};

export const addSkipLabel = (labels: Label[]) => {
  labels.push({ name: "ALLURE_TESTPLAN_SKIP", value: "true" });
};

export const addSkipLabelAsMeta = (name: string) => {
  return `${name} @allure.label.ALLURE_TESTPLAN_SKIP:true`;
};

export const hasSkipLabel = (labels: readonly Label[]) => labels.some(({ name }) => name === "ALLURE_TESTPLAN_SKIP");
