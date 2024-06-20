import type {
  FixtureResult,
  Label,
  Link,
  LinkType,
  Parameter,
  StepResult,
  TestResult,
  TestResultContainer,
} from "../../model.js";
import type { Category, EnvironmentInfo } from "../types.js";
import type { AllureContextProvider } from "./context/types.js";

export const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
export const ALLURE_SKIPPED_BY_TEST_PLAN_LABEL = "allure-skipped-by-test-plan";
export const ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE = "application/vnd.allure.message+json";

export interface AttachmentMetadata {
  name: string;
  type: string;
  content: string;
  encoding: BufferEncoding;
}

export interface StepMetadata extends Omit<StepResult, "attachments" | "steps"> {
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

export interface LifecycleListener {
  beforeTestResultStart?: (result: TestResult) => void;

  afterTestResultStart?: (result: TestResult) => void;

  beforeTestResultStop?: (result: TestResult) => void;

  afterTestResultStop?: (result: TestResult) => void;

  beforeTestResultUpdate?: (result: TestResult) => void;

  afterTestResultUpdate?: (result: TestResult) => void;

  beforeTestResultWrite?: (result: TestResult) => void;

  afterTestResultWrite?: (result: TestResult) => void;

  beforeStepStop?: (result: StepResult) => void;

  afterStepStop?: (result: StepResult) => void;
}

export type LinkTemplate = string | ((url: string) => string);

export type LinkTypeOptions = {
  urlTemplate: LinkTemplate;
  nameTemplate?: LinkTemplate;
};

export type LinkConfig<TOpts extends LinkTypeOptions = LinkTypeOptions> = Partial<Record<LinkType, TOpts>> &
  Record<string, TOpts>;

export type WriterDescriptor = [cls: string, ...args: readonly unknown[]] | string;

export interface Config {
  readonly resultsDir?: string;
  readonly writer: Writer | WriterDescriptor;
  // TODO: handle lifecycle hooks here
  readonly testMapper?: (test: TestResult) => TestResult | null;
  readonly links?: LinkConfig;
  readonly listeners?: LifecycleListener[];
  readonly environmentInfo?: EnvironmentInfo;
  readonly categories?: Category[];
  readonly contextProvider?: AllureContextProvider;
}

export interface Writer {
  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(distFileName: string, content: Buffer): void;

  writeAttachmentFromPath(distFileName: string, from: string): void;

  writeEnvironmentInfo(info: EnvironmentInfo): void;

  writeCategoriesDefinitions(categories: Category[]): void;
}

export type WellKnownWriters = {
  [key: string]: (new (...args: readonly unknown[]) => Writer) | undefined;
};

export type TestScope = {
  uuid: string;
  tests: string[];
  parent?: TestScope;
  subScopes: TestScope[];
  fixtures: FixtureWrapper[];
};

export type FixtureType = "before" | "after";

export type FixtureWrapper = {
  uuid: string;
  value: FixtureResult;
  scope?: TestScope;
  type: FixtureType;
};
