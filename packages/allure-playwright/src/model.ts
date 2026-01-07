import type { FullConfig } from "@playwright/test";
import type {
  FullResult,
  TestResult as PlaywrightTestResult,
  Suite,
  TestCase,
  TestError,
  TestStep,
} from "@playwright/test/reporter";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export interface AllurePlaywrightReporterConfig extends ReporterConfig {
  detail?: boolean;
  suiteTitle?: boolean;
}

export interface AttachStack extends TestStep {
  uuid: string;
}

export type AttachmentTarget = {
  name: string;
  stepUuid?: string;
  hookStep?: AttachStack;
};

export interface ReporterV2 {
  onConfigure(config: FullConfig): void;

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
