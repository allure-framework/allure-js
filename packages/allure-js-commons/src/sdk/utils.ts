import { readFile } from "fs/promises";
import {
  AttachmentOptions,
  ContentType,
  FixtureResult,
  RuntimeMessage,
  Stage,
  Status,
  StatusByPriority,
  StepResult,
  TestResult,
  TestResultContainer,
} from "../model.js";
import { typeToExtension } from "../utils.js";
import type { WriterDescriptor } from "./Config.js";
import { Crypto } from "./Crypto.js";
import type { Writer } from "./Writer.js";

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

export const writeAttachment = (uuid: string, options: ContentType | string | AttachmentOptions): string => {
  if (typeof options === "string") {
    options = { contentType: options };
  }

  const extension = typeToExtension(options);

  return `${uuid}-attachment${extension}`;
};

export const getTestResultHistoryId = (crypto: Crypto, result: TestResult) => {
  if (result.historyId) {
    return result.historyId;
  }

  const tcId = result.testCaseId ?? (result.fullName ? crypto.md5(result.fullName) : null);

  if (!tcId) {
    return "";
  }

  const paramsString = result.parameters
    .filter((p) => !p?.excluded)
    .sort((a, b) => a.name?.localeCompare(b?.name) || a.value?.localeCompare(b?.value))
    .map((p) => `${p.name ?? "null"}:${p.value ?? "null"}`)
    .join(",");
  const paramsHash = crypto.md5(paramsString);

  return `${tcId}:${paramsHash}`;
};

export const getTestResultTestCaseId = (crypto: Crypto, result: TestResult) => {
  return result.fullName ? crypto.md5(result.fullName) : undefined;
};

export const hasStepMessage = (messages: RuntimeMessage[]) => {
  return messages.some((message) => message.type === "step_start" || message.type === "step_stop");
};

export const getStepsMessagesPair = (messages: RuntimeMessage[]) =>
  messages.reduce((acc, message) => {
    if (message.type !== "step_start" && message.type !== "step_stop") {
      return acc;
    }

    if (message.type === "step_start") {
      acc.push([message]);

      return acc;
    }

    const unfinishedStepIdx = acc.findLastIndex((step) => step.length === 1);

    if (unfinishedStepIdx === -1) {
      return acc;
    }

    acc[unfinishedStepIdx].push(message);

    return acc;
  }, [] as RuntimeMessage[][]);

export const getUnfinishedStepsMessages = (messages: RuntimeMessage[]) => {
  const grouppedStepsMessage = getStepsMessagesPair(messages);

  return grouppedStepsMessage.filter((step) => step.length === 1);
};

export const getWorstStepResultStatusPriority = (steps: StepResult[], priority?: number): number | undefined => {
  let worstStatusPriority = priority;

  steps.forEach((step) => {
    if (step.steps?.length) {
      worstStatusPriority = getWorstStepResultStatusPriority(step.steps, worstStatusPriority);
    }

    const stepStatusPriority = step.status ? StatusByPriority.indexOf(step.status) : undefined;

    if (stepStatusPriority === undefined) {
      return;
    }

    if (worstStatusPriority === undefined) {
      worstStatusPriority = stepStatusPriority;
      return;
    }

    if (stepStatusPriority >= worstStatusPriority) {
      return;
    }

    worstStatusPriority = stepStatusPriority;
  });

  return worstStatusPriority;
};

export const getWorstStepResultStatus = (steps: StepResult[]): Status | undefined => {
  const worstStatusPriority = getWorstStepResultStatusPriority(steps);

  if (worstStatusPriority === undefined) {
    return undefined;
  }

  return StatusByPriority[worstStatusPriority];
};

export const readImageAsBase64 = async (filePath: string): Promise<string | undefined> => {
  try {
    const file = await readFile(filePath, { encoding: "base64" });

    return file ? `data:image/png;base64,${file}` : undefined;
  } catch (e) {
    return undefined;
  }
};

export type WellKnownWriters = {
  [key: string]: (new (...args: readonly unknown[]) => Writer) | undefined;
};

export const resolveWriter = (wellKnownWriters: WellKnownWriters, value: Writer | WriterDescriptor): Writer => {
  if (typeof value === "string") {
    return createWriter(wellKnownWriters, value);
  } else if (value instanceof Array) {
    return createWriter(wellKnownWriters, value[0], value.slice(1));
  }
  return value;
};

const createWriter = (wellKnownWriters: WellKnownWriters, nameOrPath: string, args: readonly unknown[] = []) => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  const ctorOrInstance = getKnownWriterCtor(wellKnownWriters, nameOrPath) ?? requireWriterCtor(nameOrPath);
  return typeof ctorOrInstance === "function" ? new ctorOrInstance(...args) : ctorOrInstance;
};

const getKnownWriterCtor = (wellKnownWriters: WellKnownWriters, name: string) =>
  (wellKnownWriters as unknown as { [key: string]: Writer | undefined })[name];

const requireWriterCtor = (modulePath: string): (new (...args: readonly unknown[]) => Writer) | Writer => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports,@typescript-eslint/no-var-requires
  return require(modulePath);
};
