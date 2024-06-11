import type * as Mocha from "mocha";
import { dirname, extname, join } from "node:path";
import { env } from "node:process";
import { fileURLToPath } from "node:url";
import type { Label } from "allure-js-commons";
import { LabelName } from "allure-js-commons";
import type { TestPlanV1, TestPlanV1Test } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getHostLabel, getRelativePath, getThreadLabel, md5, parseTestPlan } from "allure-js-commons/sdk/reporter";

const filename = fileURLToPath(import.meta.url);

const allureMochaDataKey = Symbol("Used to access Allure extra data in Mocha objects");

type AllureMochaTestData = {
  isIncludedInTestRun: boolean;
  fullName: string;
  labels: readonly Label[];
  displayName: string;
};

const getAllureData = (item: Mocha.Test): AllureMochaTestData => {
  const data = (item as any)[allureMochaDataKey];
  if (!data) {
    const meta = extractMetadataFromString(item.title);
    const defaultData: AllureMochaTestData = {
      isIncludedInTestRun: true,
      fullName: createAllureFullName(item),
      labels: meta.labels,
      displayName: meta.cleanTitle,
    };
    (item as any)[allureMochaDataKey] = defaultData;
    return defaultData;
  }
  return data;
};

const createAllureFullName = (test: Mocha.Test) => {
  const titlePath = test.titlePath().join(" > ");
  return test.file ? `${getRelativePath(test.file)}: ${titlePath}` : titlePath;
};

const createTestPlanSelectorIndex = (testplan: TestPlanV1) => createTestPlanIndex((e) => e.selector, testplan);

const createTestPlanIdIndex = (testplan: TestPlanV1) => createTestPlanIndex((e) => e.id?.toString(), testplan);

const createTestPlanIndex = <T>(keySelector: (entry: TestPlanV1Test) => T, testplan: TestPlanV1) =>
  new Set(testplan.tests.map((e) => keySelector(e)).filter((v) => v) as readonly T[]);

export type TestPlanIndices = {
  fullNameIndex: ReadonlySet<string>;
  idIndex: ReadonlySet<string>;
};

export const createTestPlanIndices = (): TestPlanIndices | undefined => {
  const testplan = parseTestPlan();
  if (testplan) {
    return {
      fullNameIndex: createTestPlanSelectorIndex(testplan),
      idIndex: createTestPlanIdIndex(testplan),
    };
  }
};

export const getAllureFullName = (test: Mocha.Test) => getAllureData(test).fullName;

export const isIncludedInTestRun = (test: Mocha.Test) => getAllureData(test).isIncludedInTestRun;

export const getAllureMetaLabels = (test: Mocha.Test) => getAllureData(test).labels;

export const getAllureId = (data: AllureMochaTestData) => {
  const values = data.labels.filter((l) => l.name === LabelName.ALLURE_ID).map((l) => l.value);
  if (values.length) {
    return values[0];
  }
};

export const getAllureDisplayName = (test: Mocha.Test) => getAllureData(test).displayName;

export const getSuitesOfMochaTest = (test: Mocha.Test) => test.titlePath().slice(0, -1);

export const resolveParallelModeSetupFile = () =>
  join(dirname(filename), `setupAllureMochaParallel${extname(filename)}`);

export const getInitialLabels = (): Label[] => [
  { name: LabelName.LANGUAGE, value: "javascript" },
  { name: LabelName.FRAMEWORK, value: "mocha" },
  getHostLabel(),
  getThreadLabel(env.MOCHA_WORKER_ID),
];

export const getTestCaseId = (test: Mocha.Test) => {
  const suiteTitles = test.titlePath().slice(0, -1);
  return md5(JSON.stringify([...suiteTitles, getAllureDisplayName(test)]));
};

export const applyTestPlan = (ids: ReadonlySet<string>, selectors: ReadonlySet<string>, rootSuite: Mocha.Suite) => {
  const suiteQueue = [];
  for (let s: Mocha.Suite | undefined = rootSuite; s; s = suiteQueue.shift()) {
    for (const test of s.tests) {
      const allureData = getAllureData(test);
      const allureId = getAllureId(allureData);
      if (!selectors.has(allureData.fullName) && (!allureId || !ids.has(allureId))) {
        allureData.isIncludedInTestRun = false;
        test.pending = true;
      }
    }
    suiteQueue.push(...s.suites);
  }
};
