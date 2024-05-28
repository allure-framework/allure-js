import type { FixtureResult, StepResult, TestResult, TestResultContainer } from "../../model.js";
import { Stage, Status } from "../../model.js";

export const createTestResultContainer = (uuid: string): TestResultContainer => {
  return {
    uuid,
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

export const createTestResult = (uuid: string, historyUuid?: string): TestResult => {
  return {
    uuid,
    name: "",
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
