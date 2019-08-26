import { FixtureResult, Stage, Status, StepResult, TestResult, TestResultContainer } from "./model";
import { v4 as randomUUID } from "uuid";

export function testResultContainer(): TestResultContainer {
  return {
    uuid: randomUUID(),
    children: [],
    befores: [],
    afters: []
  };
}

export function fixtureResult(): FixtureResult {
  return {
    status: Status.BROKEN,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: []
  };
}

export function stepResult(): StepResult {
  return {
    status: undefined,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: []
  };
}

export function testResult(): TestResult {
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
    links: []
  };
}
