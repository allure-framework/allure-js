import type { Stage, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";

// TODO: report cypress commands

export const ALLURE_REPORT_SHUTDOWN_HOOK = "__allure_report_shutdown_hook__";

export type CypressTest = Mocha.Test & {
  wallClockStartedAt?: Date;
  hookName?: string;
};

export type CypressHook = {
  name: string;
  type: "before" | "after";
  start: number;
};

export type CypressCommand = {
  attributes: {
    name: string;
    args: any[];
  };
  state: "passed" | "failed" | "queued";
};

export type CypressHookStartRuntimeMessage = {
  type: "cypress_hook_start";
  data: CypressHook;
};

export type CypressHookEndRuntimeMessage = {
  type: "cypress_hook_end";
  data: {
    stage: Stage;
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
  };
};

export type CypressSuiteStartRuntimeMessage = {
  type: "cypress_suite_start";
  data: {
    name: string;
  };
};

export type CypressSuiteEndRuntimeMessage = {
  type: "cypress_suite_end";
  data: {};
};

export type CypressTestStartRuntimeMessage = {
  type: "cypress_start";
  data: {
    isInteractive: boolean;
    absolutePath: string;
    specPath: string[];
    filename: string;
    start: number;
  };
};

export type CypressTestEndRuntimeMessage = {
  type: "cypress_end";
  data: {
    stage: Stage;
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
  };
};

// TODO: add cypress logs property
export type CypressCommandStartRuntimeMessage = {
  type: "cypress_command_start";
  data: {
    name: string;
    args: string[];
  };
};

export type CypressCommandEndRuntimeMessage = {
  type: "cypress_command_end";
  data: {
    stage: Stage;
    status: Status;
    statusDetails?: StatusDetails;
  };
};

export type CypressRuntimeMessage =
  | RuntimeMessage
  | CypressTestStartRuntimeMessage
  | CypressTestEndRuntimeMessage
  | CypressHookStartRuntimeMessage
  | CypressHookEndRuntimeMessage
  | CypressSuiteStartRuntimeMessage
  | CypressSuiteEndRuntimeMessage
  | CypressCommandStartRuntimeMessage
  | CypressCommandEndRuntimeMessage;
