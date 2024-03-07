// these types is a copy-paste from allure-js-commons/model because it isn't compatible with browser
// TODO: need to make model compatible with any environment
export type ParameterOptions = Pick<Parameter, "mode" | "excluded">;

export interface Attachment {
  name: string;
  type: string;
  source: string;
}

export type StepResult = ExecutableItem;

export interface ExecutableItem {
  name?: string;
  status?: Status;
  statusDetails: StatusDetails;
  stage: Stage;
  description?: string;
  descriptionHtml?: string;
  steps: StepResult[];
  attachments: Attachment[];
  parameters: Parameter[];
  start?: number;
  stop?: number;
}

export interface StepMetadata extends Omit<ExecutableItem, "attachments" | "steps"> {
  steps: StepMetadata[];
  attachments: AttachmentMetadata[];
}

export interface Label {
  name: LabelName | string;
  value: string;
}

export interface Link {
  name?: string;
  url: string;
  type?: LinkType | string;
}

export interface Parameter {
  name: string;
  value: string;
  excluded?: boolean;
  mode?: "hidden" | "masked" | "default";
}

export interface AttachmentMetadata {
  name: string;
  type: string;
  content: string;
  encoding: BufferEncoding;
}

export interface MetadataMessage {
  attachments?: AttachmentMetadata[];
  displayName?: string;
  testCaseId?: string;
  historyId?: string;
  labels?: Label[];
  links?: Link[];
  parameter?: Parameter[];
  description?: string;
  descriptionHtml?: string;
  steps?: StepMetadata[];
}

/* eslint-disable no-shadow */
export enum LinkType {
  ISSUE = "issue",
  TMS = "tms",
}

/* eslint-disable no-shadow */
export enum LabelName {
  ALLURE_ID = "ALLURE_ID",
  /**
   * @deprecated please use ALLURE_ID instead
   */
  AS_ID = ALLURE_ID,
  SUITE = "suite",
  PARENT_SUITE = "parentSuite",
  SUB_SUITE = "subSuite",
  EPIC = "epic",
  FEATURE = "feature",
  STORY = "story",
  SEVERITY = "severity",
  TAG = "tag",
  OWNER = "owner",
  LEAD = "lead",
  HOST = "host",
  THREAD = "thread",
  TEST_METHOD = "testMethod",
  TEST_CLASS = "testClass",
  PACKAGE = "package",
  FRAMEWORK = "framework",
  LANGUAGE = "language",
  LAYER = "layer",
}

export interface StatusDetails {
  message?: string;
  trace?: string;
}

/* eslint-disable no-shadow */
export enum Status {
  FAILED = "failed",
  BROKEN = "broken",
  PASSED = "passed",
  SKIPPED = "skipped",
}

/* eslint-disable no-shadow */
export enum Stage {
  SCHEDULED = "scheduled",
  RUNNING = "running",
  FINISHED = "finished",
  PENDING = "pending",
  INTERRUPTED = "interrupted",
}

// keep these types
export enum MessageType {
  TEST_STARTED = "TEST_STARTED",
  TEST_ENDED = "TEST_ENDED",
  STEP_STARTED = "STEP_STARTED",
  STEP_ENDED = "STEP_ENDED",
  METADATA = "METADATA",
  SCREENSHOT = "SCREENSHOT",
}

export type TestStartMessage = {
  specPath: string[];
  filename: string;
  start: number;
};

export type TestEndMessage = {
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  stop: number;
};

export type StepStartMessage = {
  type: MessageType.STEP_STARTED;
  payload: {
    name: string;
    start: number;
  };
};

export type StepEndMessage = {
  type: MessageType.STEP_ENDED;
  payload: {
    status: Status;
    statusDetails?: StatusDetails;
    stage?: Stage;
    stop: number;
  };
};

export type ScreenshotMessage = {
  type: MessageType.SCREENSHOT;
  payload: {
    path: string;
    name: string;
  };
};

export type MetadataSentMessage = {
  type: MessageType.METADATA;
  payload: MetadataMessage;
};

export type ReporterMessage = StepStartMessage | StepEndMessage | MetadataSentMessage | ScreenshotMessage;

export type ReportFinalMessage = {
  startMessage: TestStartMessage;
  endMessage: TestEndMessage;
  messages: ReporterMessage[];
};
