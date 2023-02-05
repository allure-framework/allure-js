import { readFileSync } from "node:fs";

export interface TestPlanFile {
  version: string;
  tests: {
    id: number;
    selector: string;
  }[];
}

export const testPlanFilter = () => {
  try {
    const testPlanPath = process.env.ALLURE_TESTPLAN_PATH;

    if (!testPlanPath) {
      return undefined;
    }

    const file = readFileSync(testPlanPath, "utf8");
    const testPlan = JSON.parse(file) as TestPlanFile;

    if ((testPlan.tests || []).length === 0) {
      return undefined;
    }

    const selectedTests = testPlan.tests.map((testInfo) => {
      const pattern = testInfo.selector.replace("#", " ");
      return new RegExp(escapeRegExp(pattern));
    });

    return selectedTests;
  } catch (e) {
    return undefined;
  }
};

const reRegExpChar = /[\\^$.*+?()[\]{}|]/g,
  reHasRegExpChar = RegExp(reRegExpChar.source);

export const escapeRegExp = (value: string): string => {
  return reHasRegExpChar.test(value) ? value.replace(reRegExpChar, "\\$&") : value;
};
