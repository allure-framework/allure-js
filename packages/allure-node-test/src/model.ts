import type { Label, Link, Stage, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { ReporterConfig, Writer } from "allure-js-commons/sdk/reporter";

export const ALLURE_NODE_TEST_CONFIG_ENV = "ALLURE_NODE_TEST_CONFIG";
export const ALLURE_NODE_TEST_RUN_DIR_ENV = "ALLURE_NODE_TEST_RUN_DIR";
export const ALLURE_NODE_TEST_TESTPLAN_FILTER_ENV = "ALLURE_NODE_TEST_TESTPLAN_FILTER";

export type NodeTestReporterConfig = ReporterConfig & {
  readonly writer?: Writer;
  readonly runDir?: string;
};

export type NodeTestContext = {
  readonly attempt?: number;
  readonly filePath?: string;
  readonly fullName?: string;
  readonly name?: string;
  readonly tags?: readonly string[];
  readonly testId?: number;
  readonly type?: NodeTestKind;
  readonly workerId?: number;
};

export type NodeTestTracingStore = {
  readonly file?: string;
  readonly fullName?: string;
  readonly name?: string;
  readonly nesting?: number;
  readonly testId?: number;
  readonly type?: NodeTestKind;
};

export type RuntimeMessageRecord = {
  readonly version: 1;
  readonly pid: number;
  readonly workerId?: string | number;
  readonly testId?: number;
  readonly file?: string;
  readonly name?: string;
  readonly nodeFullName?: string;
  readonly allureFullName?: string;
  readonly type?: NodeTestKind;
  readonly timestamp: number;
  readonly message: RuntimeMessage;
};

export type NodeTestKind = "suite" | "test";

export type NodeTestEventType =
  | "test:complete"
  | "test:dequeue"
  | "test:diagnostic"
  | "test:enqueue"
  | "test:fail"
  | "test:interrupted"
  | "test:pass"
  | "test:start"
  | "test:stderr"
  | "test:stdout"
  | "test:summary";

export type NodeTestEvent = {
  readonly type: NodeTestEventType | (string & {});
  readonly data?: NodeTestEventData;
};

export type NodeTestEventData = {
  readonly column?: number;
  readonly details?: NodeTestEventDetails;
  readonly file?: string;
  readonly line?: number;
  readonly message?: string;
  readonly name?: string;
  readonly nesting?: number;
  readonly skip?: string | boolean;
  readonly tags?: readonly string[];
  readonly testId?: number;
  readonly testNumber?: number;
  readonly todo?: string | boolean;
  readonly type?: NodeTestKind;
  readonly tests?: readonly NodeTestEventData[];
};

export type NodeTestEventDetails = {
  readonly attempt?: number;
  readonly duration_ms?: number;
  readonly error?: NodeTestError;
  readonly passed?: boolean;
  readonly passed_on_attempt?: number;
  readonly type?: NodeTestKind;
};

export type NodeTestError = {
  readonly actual?: unknown;
  readonly cause?: Error & {
    readonly actual?: unknown;
    readonly expected?: unknown;
  };
  readonly code?: string;
  readonly expected?: unknown;
  readonly failureType?: string;
  readonly message?: string;
  readonly name?: string;
  readonly stack?: string;
};

export type NodeTestResultEvent = {
  readonly data: NodeTestEventData;
  readonly eventType: "test:fail" | "test:pass";
  readonly receivedAt: number;
  readonly suitePath: string[];
};

export type TestMetadata = {
  readonly cleanName: string;
  readonly fullName: string;
  readonly labels: Label[];
  readonly links: Link[];
  readonly nodeFullName: string;
  readonly relativeFile: string | undefined;
  readonly suitePath: string[];
  readonly titlePath: string[];
};

export type StatusResolution = {
  readonly details: StatusDetails;
  readonly stage: Stage;
  readonly status: Status;
};
