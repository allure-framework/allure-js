/// <reference types="node" />
export declare const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
export declare const ALLURE_IMAGEDIFF_CONTENT_TYPE = "application/vnd.allure.image.diff";
export interface AttachmentMetadata {
    name: string;
    type: string;
    content: string;
    encoding: BufferEncoding;
}
export interface StepMetadata extends Omit<ExecutableItem, "attachments" | "steps"> {
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
export interface Parameter {
    name: string;
    value: string;
    excluded?: boolean;
    mode?: "hidden" | "masked" | "default";
}
export type ParameterOptions = Pick<Parameter, "mode" | "excluded">;
export interface StatusDetails {
    message?: string;
    trace?: string;
}
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
export type FixtureResult = ExecutableItem;
export type StepResult = ExecutableItem;
export interface TestResult extends ExecutableItem {
    uuid: string;
    historyId: string;
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
export declare enum Status {
    FAILED = "failed",
    BROKEN = "broken",
    PASSED = "passed",
    SKIPPED = "skipped"
}
export declare enum Stage {
    SCHEDULED = "scheduled",
    RUNNING = "running",
    FINISHED = "finished",
    PENDING = "pending",
    INTERRUPTED = "interrupted"
}
export declare enum LabelName {
    ALLURE_ID = "ALLURE_ID",
    AS_ID = "ALLURE_ID",
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
    LAYER = "layer"
}
export declare enum Severity {
    BLOCKER = "blocker",
    CRITICAL = "critical",
    NORMAL = "normal",
    MINOR = "minor",
    TRIVIAL = "trivial"
}
export declare enum ContentType {
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
    MP4 = "video/mp4"
}
export declare enum LinkType {
    ISSUE = "issue",
    TMS = "tms"
}
export interface ImageDiffAttachment {
    expected: string | undefined;
    actual: string | undefined;
    diff: string | undefined;
    name: string;
}
