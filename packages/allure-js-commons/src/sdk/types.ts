import type { Label, Link, Parameter, Status, StatusDetails, TestResult, TestResultContainer } from "../model.js";

type RuntimeMessageBase<T extends string> = {
  type: T;
};

export type RuntimeMetadataMessage = RuntimeMessageBase<"metadata"> & {
  data: {
    labels?: Label[];
    links?: Link[];
    parameters?: Parameter[];
    description?: string;
    descriptionHtml?: string;
    testCaseId?: string;
    historyId?: string;
    displayName?: string;
  };
};

export type RuntimeStartStepMessage = RuntimeMessageBase<"step_start"> & {
  data: {
    name: string;
    start: number;
  };
};

export type RuntimeStepMetadataMessage = RuntimeMessageBase<"step_metadata"> & {
  data: {
    name?: string;
    parameters?: Parameter[];
  };
};

export type RuntimeStopStepMessage = RuntimeMessageBase<"step_stop"> & {
  data: {
    stop: number;
    status: Status;
    statusDetails?: StatusDetails;
  };
};

export type RuntimeAttachmentContentMessage = RuntimeMessageBase<"attachment_content"> & {
  data: {
    name: string;
    content: string;
    encoding: BufferEncoding;
    contentType: string;
    fileExtension?: string;
    wrapInStep?: boolean;
    timestamp?: number;
  };
};

export type RuntimeAttachmentPathMessage = RuntimeMessageBase<"attachment_path"> & {
  data: {
    name: string;
    path: string;
    contentType: string;
    fileExtension?: string;
    wrapInStep?: boolean;
    timestamp?: number;
  };
};

export type RuntimeMessage =
  | RuntimeMetadataMessage
  | RuntimeStartStepMessage
  | RuntimeStepMetadataMessage
  | RuntimeStopStepMessage
  | RuntimeAttachmentContentMessage
  | RuntimeAttachmentPathMessage;

export interface TestPlanV1Test {
  id?: string | number;
  selector?: string;
}

export interface TestPlanV1 {
  version: "1.0";
  tests: TestPlanV1Test[];
}

export type EnvironmentInfo = Record<string, string | undefined>;

export interface Category {
  name?: string;
  description?: string;
  descriptionHtml?: string;
  messageRegex?: string | RegExp;
  traceRegex?: string | RegExp;
  matchedStatuses?: Status[];
  flaky?: boolean;
}

export interface ExecutorInfo {
  name?: string;
  type?: string;
  url?: string;
  buildOrder?: number;
  buildName?: string;
  buildUrl?: string;
  reportUrl?: string;
  reportName?: string;
}

export interface AllureResults {
  tests: TestResult[];
  groups: TestResultContainer[];
  attachments: Record<string, Buffer | string>;
  envInfo?: EnvironmentInfo;
  categories?: Category[];
}

export type SerializeOptions = {
  maxDepth?: number;
  maxLength?: number;
};
