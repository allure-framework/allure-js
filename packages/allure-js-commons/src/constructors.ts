import { randomUUID } from "crypto";
import { FixtureResult, Stage, Status, StepResult, TestResult, TestResultContainer } from "./model";

export const testResultContainer = (): TestResultContainer => {
  return {
    uuid: randomUUID(),
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

export const testResult = (): TestResult => {
  return {
    uuid: randomUUID(),
    historyId: randomUUID(),
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
