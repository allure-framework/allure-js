export interface Attachment {
  name: string
  type: string
  source: string
}

export interface Label {
  name: LabelName | string
  value: string
}

export interface Link {
  name?: string
  url: string
  type?: LinkType | string
}

export interface Parameter {
  name: string
  value: string
  hidden?: boolean
  excluded?: boolean
}

export interface StatusDetails {
  message?: string
  trace?: string
}

interface ExecutableItem {
  name?: string
  status?: Status
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
  testCaseId?: string
  labels: Label[]
  links: Link[]
}

export interface TestResultContainer {
  uuid: string
  name?: string
  children: string[]
  befores: FixtureResult[]
  afters: FixtureResult[]
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
  AS_ID = "AS_ID",
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

export enum LinkType {
  ISSUE = "issue",
  TMS = "tms",
}
