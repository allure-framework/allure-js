import type { FullConfig } from "@playwright/test";
import type {
  FullResult,
  Reporter,
  TestResult as PlaywrightTestResult,
  Suite,
  TestCase,
  TestError,
  TestStep,
} from "@playwright/test/reporter";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export interface AllurePlaywrightReporterConfig extends ReporterConfig {
  detail?: boolean;
  /** Whether to report unmapped Playwright annotations as steps. Defaults to true. */
  reportAnnotations?: boolean;
  /** Whether to report Playwright expect steps. Defaults to the value of detail. */
  reportMatchers?: boolean;
  suiteTitle?: boolean;
  useLegacyFullName?: boolean;
}

export type HookScope = "before" | "after";

export interface AttachStack extends TestStep {
  uuid: string;
  hookScope: HookScope;
}

export type AttachmentTarget = {
  name: string;
  stepUuid?: string;
  hookStep?: AttachStack;
  processedAtStepEnd?: boolean;
};

export type ReporterPreprocessParams = Parameters<NonNullable<Reporter["preprocess"]>>[0];

export interface ReporterV2 {
  onConfigure(config: FullConfig): void;

  // Internal merge callbacks present in Playwright 1.62.0. Runners that omit
  // them use the ordinary thread labels without a per-blob prefix.
  onReportConfigure?(): void;

  onReportEnd?(): void;

  preprocess(params: ReporterPreprocessParams): Promise<void> | void;

  onBegin(suite: Suite): void;

  onTestBegin(test: TestCase, result: PlaywrightTestResult): void;

  onStdOut(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;

  onStdErr(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;

  onTestEnd(test: TestCase, result: PlaywrightTestResult): void;

  onEnd(result: FullResult): Promise<{ status?: FullResult["status"] } | undefined | void> | void;

  onExit(): void | Promise<void>;

  onError(error: TestError): void;

  onStepBegin(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;

  onStepEnd(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;

  printsToStdio(): boolean;

  version(): "v2";
}
