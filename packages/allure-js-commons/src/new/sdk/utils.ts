import {
  AttachmentOptions,
  ContentType,
  FixtureResult,
  Stage,
  Status,
  StepResult,
  TestResult,
  TestResultContainer,
} from "../model.js";
import { typeToExtension } from "../utils.js";
import { Crypto } from "./Crypto.js";

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

export const writeAttachment = (uuid: string, options: ContentType | string | AttachmentOptions): string => {
  if (typeof options === "string") {
    options = { contentType: options };
  }

  const extension = typeToExtension(options);

  return `${uuid}-attachment${extension}`;
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
