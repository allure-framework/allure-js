import type { Label, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage, TestPlanV1 } from "allure-js-commons/sdk";
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
    name: string;
    start: number;
  };
};

export type CypressHookEndMessage = {
  type: "cypress_hook_end";
  data: {
    duration: number;
  };
};

export type CypressSuiteStartMessage = {
  type: "cypress_suite_start";
  data: {
    name: string;
    root: boolean;
    start: number;
  };
};

export type CypressSuiteEndMessage = {
  type: "cypress_suite_end";
  data: {
    root: boolean;
    stop: number;
  };
};

export type CypressTestStartMessage = {
  type: "cypress_test_start";
  data: {
    name: string;
    fullName: string;
    start: number;
    labels: Label[];
  };
};

export type CypressFailMessage = {
  type: "cypress_fail";
  data: {
    status: Status;
    statusDetails: StatusDetails;
  };
};

export type CypressTestSkipMessage = {
  type: "cypress_test_skip";
  data: object;
};

export type CypressTestPassMessage = {
  type: "cypress_test_pass";
  data: object;
};

export type CypressTestEndMessage = {
  type: "cypress_test_end";
  data: {
    duration: number;
    retries: number;
  };
};

export type CypressCommandStartMessage = {
  type: "cypress_command_start";
  data: {
    name: string;
    args: string[];
    start: number;
  };
};

export type CypressCommandEndMessage = {
  type: "cypress_command_end";
  data: {
    status: Status;
    statusDetails?: StatusDetails;
    stop: number;
  };
};

export type CypressMessage =
  | RuntimeMessage
  | CypressTestStartMessage
  | CypressFailMessage
  | CypressTestSkipMessage
  | CypressTestPassMessage
  | CypressTestEndMessage
  | CypressHookStartMessage
  | CypressHookEndMessage
  | CypressSuiteStartMessage
  | CypressSuiteEndMessage
  | CypressCommandStartMessage
  | CypressCommandEndMessage;

export type SpecContext = {
  specPath: string;
  package: string;
  test: string | undefined;
  fixture: string | undefined;
  commandSteps: string[];
  videoScope: string;
  suiteScopes: string[];
  testScope: string | undefined;
  suiteNames: string[];
  failed: boolean;
};

export type AllureSpecState = {
  initialized: boolean;
  testPlan: TestPlanV1 | null | undefined;
  messages: CypressMessage[];
};

export type HookPosition = "before" | "after";

export type HookScopeType = "all" | "each";

export type HookType = [position: HookPosition, scopeType: HookScopeType];

export type AllureCypressTaskArgs = {
  absolutePath: string;
  messages: readonly CypressMessage[];
};

export type CypressSuiteFunction = (
  title: string,
  configOrFn?: Cypress.SuiteConfigOverrides | ((this: Mocha.Suite) => void),
  fn?: (this: Mocha.Suite) => void,
) => Mocha.Suite;
