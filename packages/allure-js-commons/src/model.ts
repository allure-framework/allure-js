export interface Attachment {
  name: string
  type: string
  source: string
}

export interface Label {
  name: string
  value: string
}

export interface Link {
  name: string
  url: string
  type?: string
}

export interface Parameter {
  name: string
  value: string
}

export interface StatusDetails {
  known?: boolean
  muted?: boolean
  flaky?: boolean
  message?: string
  trace?: string
}

interface ExecutableItem {
  name?: string
  status: Status
  statusDetails: StatusDetails
  stage: Stage
  description?: string
  descriptionHtml?: string
  steps: StepResult[]
  attachments: Attachment[]
  parameters: Parameter[]
  start?: number
  stop?: number
}

export type FixtureResult = ExecutableItem;
export type StepResult = ExecutableItem;

export interface TestResult extends ExecutableItem {
  uuid: string
  historyId: string
  fullName?: string
  labels: Label[]
  links: Link[]
}

export interface TestResultContainer {
  uuid: string
  name?: string
  children: string[]
  description?: string
  descriptionHtml?: string
  befores: FixtureResult[]
  afters: FixtureResult[]
  links: Link[]
  start?: number
  stop?: number
}

export interface Category {
  name?: string
  description?: string
  descriptionHtml?: string
  messageRegex?: string | RegExp
  traceRegex?: string | RegExp
  matchedStatuses?: Status[]
  flaky?: boolean
}

export interface ExecutorInfo {
  name?: string
  type?: string
  url?: string
  buildOrder?: number
  buildName?: string
  buildUrl?: string
  reportUrl?: string
  reportName?: string
}

/* eslint-disable no-undef */
export enum Status {
  FAILED = "failed",
  BROKEN = "broken",
  PASSED = "passed",
  SKIPPED = "skipped"
}

/* eslint-disable no-undef */
export enum Stage {
  SCHEDULED = "scheduled",
  RUNNING = "running",
  FINISHED = "finished",
  PENDING = "pending",
  INTERRUPTED = "interrupted"
}

/* eslint-disable no-undef */
export enum LabelName {
  OWNER = "owner",
  SEVERITY = "severity",
  ISSUE = "issue",
  TAG = "tag",
  TEST_TYPE = "testType",
  PARENT_SUITE = "parentSuite",
  SUITE = "suite",
  SUB_SUITE = "subSuite",
  PACKAGE = "package",
  EPIC = "epic",
  FEATURE = "feature",
  STORY = "story",
  TEST_CLASS = "testClass",
  TEST_METHOD = "testMethod",
  HOST = "host",
  THREAD = "thread",
  LANGUAGE = "language",
  FRAMEWORK = "framework",
  RESULT_FORMAT = "resultFormat"
}

/* eslint-disable no-undef */
export enum Severity {
  BLOCKER = "blocker",
  CRITICAL = "critical",
  NORMAL = "normal",
  MINOR = "minor",
  TRIVIAL = "trivial"
}

export enum ContentType {
  TEXT = "text/plain",
  XML = "application/xml",
  CSV = "text/csv",
  TSV = "text/tab-separated-values",
  CSS = "text/css",
  URI = "text/uri-list",
  SVG = "image/svg+xml",
  PNG = "image/png",
  JSON = "application/json",
  WEBM = "video/webm",
  JPEG = "image/jpeg"
}
