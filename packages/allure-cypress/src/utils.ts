import { LabelName } from "allure-js-commons";
import type { TestPlanV1 } from "allure-js-commons/sdk";
import { extractMetadataFromString } from "allure-js-commons/sdk";
import type { CypressCommand } from "./model.js";
import { ALLURE_REPORT_STEP_COMMAND } from "./model.js";

export const uint8ArrayToBase64 = (data: unknown) => {
  // @ts-ignore
  const u8arrayLike = Array.isArray(data) || data.buffer;

  if (!u8arrayLike) {
    return data as string;
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
  return btoa(String.fromCharCode.apply(null, data as number[]));
};

export const getSuitePath = (test: Mocha.Test): string[] => {
  const path: string[] = [];
  let currentSuite: Mocha.Suite | undefined = test.parent;

  while (currentSuite) {
    if (currentSuite.title) {
      path.unshift(currentSuite.title);
    }

    currentSuite = currentSuite.parent;
  }

  return path;
};

export const isCommandShouldBeSkipped = (command: CypressCommand) => {
  if (last(command.attributes.args)?.log === false) {
    return true;
  }

  if (command.attributes.name === "task" && command.attributes.args[0] === "allureReportTest") {
    return true;
  }

  // we don't need to report then commands because it's just a promise handle
  if (command.attributes.name === "then") {
    return true;
  }

  // we should skip artificial wrap from allure steps
  if (command.attributes.name === "wrap" && command.attributes.args[0] === ALLURE_REPORT_STEP_COMMAND) {
    return true;
  }

  return false;
};

export const toReversed = <T = unknown>(arr: T[]): T[] => {
  const result: T[] = [];

  for (let i = arr.length - 1; i >= 0; i--) {
    result.push(arr[i]);
  }

  return result;
};

export const isGlobalHook = (hookName: string) => {
  return /(before|after) all/.test(hookName);
};

export const getHookType = (hookName: string) => {
  return hookName.includes("before") ? "before" : "after";
};

export const last = <T = unknown>(arr: T[]): T | undefined => {
  return arr[arr.length - 1];
};

export const isTestPresentInTestPlan = (
  test: {
    title: string;
    titlePath: string[];
  },
  spec: Cypress.Spec,
  testPlan: TestPlanV1,
) => {
  const testFullName = `${spec.relative}#${test.titlePath.join(" ")}`;
  const { labels } = extractMetadataFromString(test.title);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};
