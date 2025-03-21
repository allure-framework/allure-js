import type * as Mocha from "mocha";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LabelName } from "allure-js-commons";
import type { TestPlanV1, TestPlanV1Test } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import { getPosixPath, getRelativePath, md5, parseTestPlan } from "allure-js-commons/sdk/reporter";
import type { AllureMochaTestData, HookCategory, HookScope, HookType, TestPlanIndices } from "./types.js";

const filename = fileURLToPath(import.meta.url);

const allureMochaDataKey = Symbol("Used to access Allure extra data in Mocha objects");

const getAllureData = (item: Mocha.Test): AllureMochaTestData => {
  const data = (item as any)[allureMochaDataKey];

  if (!data) {
    const meta = extractMetadataFromString(item.title);
    const defaultData: AllureMochaTestData = {
      isIncludedInTestRun: true,
      fullName: createAllureFullName(item),
      labels: meta.labels,
      links: meta.links,
      displayName: meta.cleanTitle,
    };

    (item as any)[allureMochaDataKey] = defaultData;

    return defaultData;
  }

  return data;
};

const createAllureFullName = (test: Mocha.Test) => {
  const titlePath = test.titlePath().join(" > ");
  return test.file ? `${getPosixPath(getRelativePath(test.file))}: ${titlePath}` : titlePath;
};

const createTestPlanSelectorIndex = (testplan: TestPlanV1) => createTestPlanIndex((e) => e.selector, testplan);

const createTestPlanIdIndex = (testplan: TestPlanV1) => createTestPlanIndex((e) => e.id?.toString(), testplan);

const createTestPlanIndex = <T>(keySelector: (entry: TestPlanV1Test) => T | undefined, testplan: TestPlanV1): Set<T> =>
  new Set(testplan.tests.map((e) => keySelector(e)).filter((v) => v)) as Set<T>;

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

export const getAllureMetaLinks = (test: Mocha.Test) => getAllureData(test).links;

export const getAllureId = (data: AllureMochaTestData) => {
  const values = data.labels.filter((l) => l.name === LabelName.ALLURE_ID).map((l) => l.value);
  if (values.length) {
    return values[0];
  }
};

export const getAllureDisplayName = (test: Mocha.Test) => getAllureData(test).displayName;

export const getTestScope = (test: Mocha.Test) => getAllureData(test).scope;

export const setTestScope = (test: Mocha.Test, scope: string) => {
  getAllureData(test).scope = scope;
};

export const getSuitesOfMochaTest = (test: Mocha.Test) => test.titlePath().slice(0, -1);

export const resolveParallelModeSetupFile = () =>
  join(dirname(filename), `setupAllureMochaParallel${extname(filename)}`);

export const getTestCaseId = (test: Mocha.Test) => {
  const testFilePath = test.file ? getPosixPath(getRelativePath(test.file)) : "";
  const suiteTitles = test.titlePath().slice(0, -1);
  return md5(JSON.stringify([testFilePath, ...suiteTitles, getAllureDisplayName(test)]));
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

const hookTypeRegexp = /^"(before|after) (all|each)"/;

export const getHookType = (hook: Mocha.Hook): HookType => {
  if (hook.title) {
    const match = hookTypeRegexp.exec(hook.title);
    if (match) {
      return [match[1] as HookCategory, match[2] as HookScope];
    }
  }
  return [];
};
