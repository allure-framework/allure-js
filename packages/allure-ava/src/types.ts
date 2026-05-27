import type { StatusDetails } from "allure-js-commons";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export type AllureAvaReporterConfig = ReporterConfig;

export type AllureAvaPatchConfig = {
  reporterConfig?: AllureAvaReporterConfig;
  setupModule?: string;
};

export type AvaSerializedError = {
  message?: string;
  name?: string;
  stack?: string;
  type?: string;
  assertion?: string;
  errors?: AvaSerializedError[];
};

export type AvaStats = {
  byFile?: Map<string, unknown>;
};

export type AvaStateChangeEvent = {
  type: string;
  testFile?: string;
  title?: string;
  duration?: number;
  knownFailing?: boolean;
  skip?: boolean;
  todo?: boolean;
  logs?: string[];
  err?: AvaSerializedError;
  stats?: AvaStats;
  pendingTests?: Map<string, Set<string>>;
  period?: number;
  nonZeroExitCode?: number | boolean;
  signal?: string;
  forcedExit?: boolean;
};

export type AllureAvaRuntimeMessageEvent = {
  type: "allure-runtime-message";
  testFile?: string;
  title?: string;
  isHook?: boolean;
  messages: unknown[];
};

export type AllureAvaGlobalRuntimeMessageEvent = {
  type: "allure-global-runtime-message";
  testFile?: string;
  messages: unknown[];
};

export type RuntimeContext = {
  title?: string;
  isHook?: boolean;
};

export type NormalizedStatusDetails = Required<Pick<StatusDetails, "message">> & Pick<StatusDetails, "trace">;
