import type { Status } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export type AllureTestCafeReporterConfig = ReporterConfig & {
  captureActionsAsSteps?: boolean;
};

export type TestCafeReportDataLog = {
  addData: (data: unknown[]) => PromiseLike<unknown> | unknown;
};

export type TestCafeContextTestRun = {
  reportDataLog?: TestCafeReportDataLog;
};

export type TestCafeTestRunTrackerModule = {
  resolveContextTestRun?: () => TestCafeContextTestRun | undefined;
  activeTestRuns?: Record<string, TestCafeContextTestRun>;
};

export type TestCafeTestStartInfo = {
  testRunIds?: string[];
  testId?: string;
  startTime?: Date;
};

export type TestCafeBrowserInfo = {
  testRunId: string;
  prettyUserAgent?: string;
  userAgent?: string;
};

export type TestCafeScreenshotInfo = {
  testRunId?: string;
  screenshotPath: string;
  thumbnailPath?: string;
  userAgent?: string;
  quarantineAttempt?: number;
  takenOnFail?: boolean;
  actionId?: string;
};

export type TestCafeVideoInfo = {
  testRunId?: string;
  videoPath: string;
  singleFile?: boolean;
  timecodes?: number[];
};

export type TestCafeQuarantineAttempt = {
  passed?: boolean;
};

export type TestCafeTestRunInfo = {
  errs: unknown[];
  warnings: string[];
  durationMs: number;
  unstable?: boolean;
  screenshotPath?: string;
  screenshots?: TestCafeScreenshotInfo[];
  videos?: TestCafeVideoInfo[];
  quarantine?: Record<string, TestCafeQuarantineAttempt>;
  skipped?: boolean;
  reportData?: Record<string, unknown[]>;
  browsers?: TestCafeBrowserInfo[];
};

export type TestCafeTaskResult = {
  passedCount: number;
  failedCount: number;
  skippedCount: number;
};

export type TestCafeFormattedSelector = {
  expression?: string;
  timeout?: number;
  element?: unknown;
};

export type TestCafeFormattedCommand = Record<string, unknown> & {
  type?: string;
  actionId?: string;
  selector?: TestCafeFormattedSelector;
  destinationSelector?: TestCafeFormattedSelector;
  startSelector?: TestCafeFormattedSelector;
  endSelector?: TestCafeFormattedSelector;
  options?: Record<string, unknown>;
  name?: string;
  url?: string;
  keys?: string;
  text?: string;
  timeout?: number;
};

export type TestCafeReporterActionInfo = {
  testRunId: string;
  test: {
    id: string;
    name: string;
    phase?: string;
  };
  fixture: {
    id: string;
    name: string;
  };
  command: TestCafeFormattedCommand;
  browser?: TestCafeBrowserInfo;
  duration?: number;
  err?: unknown;
};

export type TestCafeReporterDataInfo = {
  testRunId: string;
  browser?: TestCafeBrowserInfo;
  test?: {
    id: string;
    name: string;
    meta?: Record<string, unknown>;
  };
  fixture?: {
    id: string;
    name: string;
    path?: string;
    meta?: Record<string, unknown>;
  };
};

export type TestCafeReporterWarningInfo = {
  message: string;
  testRunId?: string;
  actionId?: string;
};

export type TestCafeReporterContext = {
  formatError?: (error: unknown, prefix?: string) => string;
};

export type TestCafeErrorLike = Partial<Error> & {
  errMsg?: unknown;
  originError?: unknown;
  actual?: unknown;
  expected?: unknown;
};

export type TestCafeReporterPlugin = {
  noColors?: boolean;
  init?: (version: string) => void;
  reportTaskStart?: (startTime: Date, userAgents: string[], testCount: number) => Promise<void> | void;
  reportFixtureStart?: (name: string, path: string, meta: Record<string, unknown>) => Promise<void> | void;
  reportTestStart?: (
    name: string,
    meta: Record<string, unknown>,
    testStartInfo: TestCafeTestStartInfo,
  ) => Promise<void> | void;
  reportTestActionStart?: (apiActionName: string, info: TestCafeReporterActionInfo) => Promise<void> | void;
  reportTestActionDone?: (apiActionName: string, info: TestCafeReporterActionInfo) => Promise<void> | void;
  reportWarnings?: (warningInfo: TestCafeReporterWarningInfo) => Promise<void> | void;
  reportData?: (testRunInfo: TestCafeReporterDataInfo, ...data: unknown[]) => Promise<void> | void;
  reportTestDone?: (
    this: TestCafeReporterContext,
    name: string,
    testRunInfo: TestCafeTestRunInfo,
    meta: Record<string, unknown>,
  ) => Promise<void> | void;
  reportTaskDone?: (
    endTime: Date,
    passed: number,
    warnings: string[],
    result: TestCafeTaskResult,
  ) => Promise<void> | void;
};

export type TestCafeReporterFactory = () => TestCafeReporterPlugin;

export type FixtureState = {
  name: string;
  path: string;
  relativePath: string;
  meta: Record<string, unknown>;
};

export type StartedTestState = {
  rawName: string;
  cleanTitle: string;
  fullName: string;
  titlePath: string[];
  testUuid: string;
  testRunId?: string;
  fixture: FixtureState;
  meta: Record<string, unknown>;
};

export type StartedTestGroupState = {
  rawName: string;
  fixture: FixtureState;
  meta: Record<string, unknown>;
  startedTests: StartedTestState[];
};

export type AllureTestCafeRuntimeEnvelope = {
  __allure_testcafe_runtime_message__: true;
  message: RuntimeMessage;
};

export type RuntimeMessagesByTestRun = Record<string, RuntimeMessage[]>;

export type ReporterStatusResult = {
  status: Status;
  formattedErrors?: string;
};
