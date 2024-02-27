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

export interface TestMetadata {
  displayName?: string;
  description?: string;
  descriptionHtml?: string;
  labels?: Label[];
  links?: Link[];
}

export interface MetadataMessage extends TestMetadata {
  attachments?: AttachmentMetadata[];
  testCaseId?: string;
  historyId?: string;
  parameter?: Parameter[];
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
export type StartTestMessage = {
  specPath: string[];
  filename: string;
  start: number;
  metadata: TestMetadata;
};

export type EndTestMessage = {
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  stop: number;
};

export type StartStepMessage = {
  name: string;
};

export type EndStepMessage = {
  status: Status;
  statusDetails?: StatusDetails;
  stage?: Stage;
};
