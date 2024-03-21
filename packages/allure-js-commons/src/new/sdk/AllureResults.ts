import { FixtureResult, Stage, Status, StepResult, TestResult, TestResultContainer } from "../model.js";

export type UUIDGenerator = () => string;

export const testResultContainer = (uuid: string): TestResultContainer => {
  return {
    uuid,
    children: [],
    befores: [],
    afters: [],
  };
};

export const fixtureResult = (): FixtureResult => {
  return {
    status: Status.BROKEN,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
  };
};

export const stepResult = (): StepResult => {
  return {
    status: undefined,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
  };
};

export const testResult = (uuid: string, historyUuid: string): TestResult => {
  return {
    uuid,
    historyId: historyUuid,
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
