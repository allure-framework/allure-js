import type { Writer } from "./sdk/Writer.js";

export const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
export const ALLURE_IMAGEDIFF_CONTENT_TYPE = "application/vnd.allure.image.diff";
export const ALLURE_SKIPPED_BY_TEST_PLAN_LABEL = "allure-skipped-by-test-plan";
export const ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE = "application/vnd.allure.message+json";

export type EnvironmentInfo = Record<string, string | undefined>;

export interface AttachmentMetadata {
  name: string;
  type: string;
  content: string;
  encoding: BufferEncoding;
}

export interface StepMetadata extends Omit<Executable, "attachments" | "steps"> {
  steps: StepMetadata[];
  attachments: AttachmentMetadata[];
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

export interface Attachment {
  name: string;
  type: string;
  source: string;
}

export interface AttachmentOptions {
  contentType: ContentType | string;
  encoding?: string;
  fileExtension?: string;
}

export interface RawAttachment extends AttachmentOptions {
  name: string;
  content: Buffer | string;
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

export type ParameterMode = "hidden" | "masked" | "default";

export interface Parameter {
  name: string;
  value: string;
  excluded?: boolean;
  mode?: ParameterMode;
}

export type ParameterOptions = Pick<Parameter, "mode" | "excluded">;

export interface StatusDetails {
  message?: string;
  trace?: string;
}

// don't use the interface as is, use Results types instead
export interface Executable {
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

export type FixtureResult = Executable;

export type StepResult = Executable;

export interface TestResult extends Executable {
  uuid: string;
  historyId?: string;
  fullName?: string;
  testCaseId?: string;
  labels: Label[];
  links: Link[];
}

export interface TestResultContainer {
  uuid: string;
  name?: string;
  children: string[];
  befores: FixtureResult[];
  afters: FixtureResult[];
}

export type TestOrStepResult = StepResult | TestResult;

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

/* eslint-disable no-shadow */
export enum Status {
  FAILED = "failed",
  BROKEN = "broken",
  PASSED = "passed",
  SKIPPED = "skipped",
}

export const StatusByPriority = [Status.FAILED, Status.BROKEN, Status.PASSED, Status.SKIPPED];

/* eslint-disable no-shadow */
export enum Stage {
  SCHEDULED = "scheduled",
  RUNNING = "running",
  FINISHED = "finished",
  PENDING = "pending",
  INTERRUPTED = "interrupted",
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

/* eslint-disable no-shadow */
export enum Severity {
  BLOCKER = "blocker",
  CRITICAL = "critical",
  NORMAL = "normal",
  MINOR = "minor",
  TRIVIAL = "trivial",
}

/* eslint-disable no-shadow */
export enum ContentType {
  TEXT = "text/plain",
  XML = "application/xml",
  HTML = "text/html",
  CSV = "text/csv",
  TSV = "text/tab-separated-values",
  CSS = "text/css",
  URI = "text/uri-list",
  SVG = "image/svg+xml",
  PNG = "image/png",
  JSON = "application/json",
  ZIP = "application/zip",
  WEBM = "video/webm",
  JPEG = "image/jpeg",
  MP4 = "video/mp4",
}

/* eslint-disable no-shadow */
export enum LinkType {
  ISSUE = "issue",
  TMS = "tms",
}

export interface ImageDiffAttachment {
  expected: string | undefined; // data:image;base64,
  actual: string | undefined; // data:image;base64,
  diff: string | undefined; // data:image;base64,
  name: string;
}

export interface AllureResults {
  tests: TestResult[];
  groups: TestResultContainer[];
  attachments: Record<string, Buffer | string>;
  envInfo?: EnvironmentInfo;
  categories?: Category[];
}

type RuntimeMessageBase<T extends string> = {
  type: T;
};

type MessageTypes<T> = T extends RuntimeMessageBase<infer K> ? K : never;

export type RuntimeMetadataMessage = RuntimeMessageBase<"metadata"> & {
  data: {
    labels?: Label[];
    links?: Link[];
    parameters?: Parameter[];
    attachments?: Attachment[];
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
    stage: Stage;
    statusDetails?: StatusDetails;
  };
};

// use to send whole attachment to ReporterRuntime and write it on the node side
export type RuntimeRawAttachmentMessage = RuntimeMessageBase<"raw_attachment"> & {
  data: RawAttachment;
};

export type RuntimeMessage =
  | RuntimeMetadataMessage
  | RuntimeStartStepMessage
  | RuntimeStepMetadataMessage
  | RuntimeStopStepMessage
  | RuntimeRawAttachmentMessage;

// Could be used by adapters to define additional message types
export type ExtensionMessage<T extends string> = T extends MessageTypes<RuntimeMessage> ? never : RuntimeMessageBase<T>;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type Messages<T> = T extends RuntimeMessage | ExtensionMessage<infer _> ? T : never;

export type WellKnownWriters = {
  [key: string]: (new (...args: readonly unknown[]) => Writer) | undefined;
};
