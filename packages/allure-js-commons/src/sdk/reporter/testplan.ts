import { readFileSync } from "node:fs";
import type { Label } from "../../model.js";
import type { TestPlanV1 } from "../types.js";
import { allureIdRegexp } from "../utils.js";

export const parseTestPlan = (): TestPlanV1 | undefined => {
  const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;

  if (!testPlanPath) {
    return undefined;
  }

  try {
    const file = readFileSync(testPlanPath, "utf8");
    const testPlan = JSON.parse(file) as TestPlanV1;

    // Execute all tests if test plan is empty
    if ((testPlan.tests || []).length === 0) {
      return undefined;
    }

    return testPlan;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`could not parse test plan ${testPlanPath}`, e);
    return undefined;
  }
};

export const includedInTestPlan = (
  testPlan: TestPlanV1,
  subject: { id?: string; fullName?: string; tags?: string[] },
): boolean => {
  const { id, fullName, tags = [] } = subject;
  const effectiveId =
    id ?? tags.map((tag) => tag?.match(allureIdRegexp)?.groups?.id).find((maybeId) => maybeId !== undefined);

  return testPlan.tests.some((test) => {
    const idMatched = effectiveId && test.id ? String(test.id) === effectiveId : false;
    const selectorMatched = fullName && test.selector === fullName;

    return idMatched || selectorMatched;
  });
};

export const addSkipLabel = (labels: Label[]) => {
  labels.push({ name: "ALLURE_TESTPLAN_SKIP", value: "true" });
};

export const addSkipLabelAsMeta = (name: string) => {
  return `${name} @allure.label.ALLURE_TESTPLAN_SKIP:true`;
};

export const hasSkipLabel = (labels: readonly Label[]) => labels.some(({ name }) => name === "ALLURE_TESTPLAN_SKIP");
