import { FixtureResult, StepResult, TestResult, TestResultContainer } from "./model";
import { v4 as randomUUID } from "uuid";
import { Status } from "./model";
import { Stage } from "./model";

export function testResultContainer(): TestResultContainer {
  return {
    uuid: randomUUID(),
    children: [],
    befores: [],
    afters: [],
    links: []
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
    status: Status.BROKEN,
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
    status: Status.BROKEN,
    statusDetails: {},
    stage: Stage.PENDING,
    steps: [],
    attachments: [],
    parameters: [],
    labels: [],
    links: []
  };
}
