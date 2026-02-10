import { LabelName } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import type { CypressSuite, CypressTest } from "../types.js";
import { getAllureTestPlan, getProjectName } from "./state.js";
import { getTestMetadata, resolveSpecRelativePath } from "./utils.js";

export const applyTestPlan = (spec: Cypress.Spec, root: CypressSuite) => {
  const testPlan = getAllureTestPlan();
  if (testPlan) {
    const specPath = resolveSpecRelativePath(spec);
    for (const suite of iterateSuites(root)) {
      const indicesToRemove = getIndicesOfDeselectedTests(testPlan, spec, specPath, suite.tests);
      removeSortedIndices(suite.tests, indicesToRemove);
    }
  }
};

const iterateSuites = function* (parent: CypressSuite) {
  const suiteStack: CypressSuite[] = [];
  for (let s: CypressSuite | undefined = parent; s; s = suiteStack.pop()) {
    yield s;

    // Pushing in reverse allows us to maintain depth-first pre-order traversal -
    // the same order as used by Mocha & Cypress.
    for (let i = s.suites.length - 1; i >= 0; i--) {
      suiteStack.push(s.suites[i]);
    }
  }
};

const getIndicesOfDeselectedTests = (
  testPlan: TestPlanV1,
  spec: Cypress.Spec,
  specPath: string,
  tests: readonly CypressTest[],
) => {
  const indicesToRemove: number[] = [];
  const projectName = getProjectName();
  const fullNameBase = projectName ? `${projectName}:${specPath}` : specPath;
  tests.forEach((test, index) => {
    const { fullNameSuffix, labels } = getTestMetadata(test);
    const fullName = `${fullNameBase}#${fullNameSuffix}`;
    const allureId = labels.find(({ name }) => name === LabelName.ALLURE_ID)?.value;

    if (!includedInTestPlan(testPlan, fullName, allureId)) {
      indicesToRemove.push(index);
    }
  });
  return indicesToRemove;
};

const removeSortedIndices = <T>(arr: T[], indices: readonly number[]) => {
  for (let i = indices.length - 1; i >= 0; i--) {
    arr.splice(indices[i], 1);
  }
};

const includedInTestPlan = (testPlan: TestPlanV1, fullName: string, allureId: string | undefined): boolean =>
  testPlan.tests.some((test) => (allureId && test.id?.toString() === allureId) || test.selector === fullName);
