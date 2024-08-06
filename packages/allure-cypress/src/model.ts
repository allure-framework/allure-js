import type { Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export const ALLURE_REPORT_SYSTEM_HOOK = "__allure_report_system_hook__";

export const ALLURE_REPORT_STEP_COMMAND = "__allure_report_step_command__";

export type AllureCypressConfig = ReporterConfig & {
  videoOnFailOnly?: boolean;
};

export type CypressTest = Mocha.Test & {
  wallClockStartedAt?: Date;
  hookName?: string;
  id: string;
};

export type CypressHook = Mocha.Hook & {
  id: string;
  hookId: string;
  parent: Mocha.Suite & {
    id: string;
  };
};

export type CypressCommand = {
  attributes: {
    name: string;
    id: string;
    args: any[];
  };
  state: "passed" | "failed" | "queued";
};

export type CypressHookStartMessage = {
  type: "cypress_hook_start";
  data: {
    id: string;
    parentId: string;
    name: string;
    type: "before" | "after";
    start: number;
    global: boolean;
  };
};

export type CypressHookEndMessage = {
  type: "cypress_hook_end";
  data: {
    id: string;
    parentId: string;
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
    global: boolean;
  };
};

export type CypressSuiteStartMessage = {
  type: "cypress_suite_start";
  data: {
    id: string;
    name: string;
    root?: boolean;
  };
};

export type CypressSuiteEndMessage = {
  type: "cypress_suite_end";
  data: {
    id: string;
    root?: boolean;
  };
};

export type CypressTestStartMessage = {
  type: "cypress_test_start";
  data: {
    id: string;
    specPath: string[];
    filename: string;
    start: number;
  };
};

export type CypressTestEndMessage = {
  type: "cypress_test_end";
  data: {
    id: string;
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
    retries: number;
  };
};

export type CypressCommandStartMessage = {
  type: "cypress_command_start";
  data: {
    id: string;
    name: string;
    args: string[];
  };
};

export type CypressCommandEndMessage = {
  type: "cypress_command_end";
  data: {
    id: string;
    status: Status;
    statusDetails?: StatusDetails;
  };
};

export type CypressMessage =
  | RuntimeMessage
  | CypressTestStartMessage
  | CypressTestEndMessage
  | CypressHookStartMessage
  | CypressHookEndMessage
  | CypressSuiteStartMessage
  | CypressSuiteEndMessage
  | CypressCommandStartMessage
  | CypressCommandEndMessage;

export type RunContextByAbsolutePath = {
  executables: string[];
  steps: string[];
  scopes: string[];
  globalHooksMessages: (CypressHookStartMessage | CypressHookEndMessage)[];
};
