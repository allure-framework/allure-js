export interface Attachment {
  name: string;
  type?: string;
  source: string;
}

export interface AttachmentOptions {
  contentType: ContentType | string;
  encoding?: BufferEncoding;
  fileExtension?: string;
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
interface Executable {
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

export interface FixtureResult extends Executable {}

export interface StepResult extends Executable {}

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
  IMAGEDIFF = "application/vnd.allure.image.diff",
}

/* eslint-disable no-shadow */
export enum LinkType {
  DEFAULT = "link",
  ISSUE = "issue",
  TMS = "tms",
}

export interface ImageDiffAttachment {
  expected: string | undefined; // data:image;base64,
  actual: string | undefined; // data:image;base64,
  diff: string | undefined; // data:image;base64,
  name: string;
}
