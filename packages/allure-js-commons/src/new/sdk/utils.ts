import {
  Crypto,
  FixtureResult,
  Stage,
  Status,
  StepResult,
  TestResult,
  TestResultContainer,
} from "../model.js";

export const createTestResultContainer = (crypto: Crypto): TestResultContainer => {
  return {
    uuid: crypto.uuid(),
    children: [],
    befores: [],
    afters: [],
  };
};

export const createFixtureResult = (): FixtureResult => {
  return {
    status: Status.BROKEN,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
  };
};

export const createStepResult = (): StepResult => {
  return {
    status: undefined,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
  };
};

export const createTestResult = (crypto: Crypto, historyUuid?: string): TestResult => {
  return {
    uuid: crypto.uuid(),
    historyId: historyUuid || "",
    status: undefined,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
    labels: [],
    links: [],
  };
};

export const setTestResultHistoryId = (crypto: Crypto, result: TestResult) => {
  if (result.historyId) {
    return result;
  }

  const tcId = result.testCaseId ? result.testCaseId : result.fullName ? crypto.md5(result.fullName) : null;

  if (!tcId) {
    return;
  }

  const paramsString = result.parameters
    .filter((p) => !p?.excluded)
    .sort((a, b) => a.name?.localeCompare(b?.name) || a.value?.localeCompare(b?.value))
    .map((p) => `${p.name ?? "null"}:${p.value ?? "null"}`)
    .join(",");
  const paramsHash = crypto.md5(paramsString);

  return {
    ...result,
    historyId: `${tcId}:${paramsHash}`,
  };
};
