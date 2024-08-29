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

export const ALLURE_METADATA_CONTENT_TYPE = "application/vnd.allure.metadata+json";
export const ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE = "application/vnd.allure.message+json";

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

export interface ReporterConfig {
  readonly resultsDir?: string;
  readonly links?: LinkConfig;
  readonly listeners?: LifecycleListener[];
  readonly environmentInfo?: EnvironmentInfo;
  readonly categories?: Category[];
}

export interface ReporterRuntimeConfig extends Omit<ReporterConfig, "resultsDir"> {
  readonly writer: Writer | WriterDescriptor;
}

export interface Writer {
  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(distFileName: string, content: Buffer): void;

  writeAttachmentFromPath(distFileName: string, from: string): void;

  writeEnvironmentInfo(info: EnvironmentInfo): void;

  writeCategoriesDefinitions(categories: Category[]): void;
}

export type TestScope = {
  uuid: string;
  tests: string[];
  fixtures: FixtureResultWrapper[];
  labels: Label[];
  links: Link[];
  parameters: Parameter[];
  description?: string;
  descriptionHtml?: string;
};

export type FixtureType = "before" | "after";

export type FixtureResultWrapper = {
  uuid: string;
  value: FixtureResult;
  type: FixtureType;
  scopeUuid: string;
};

export type TestResultWrapper = {
  value: TestResult;
  scopeUuids: string[];
};
