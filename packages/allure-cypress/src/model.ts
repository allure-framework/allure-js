import type { Label, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage, TestPlanV1 } from "allure-js-commons/sdk";
import type { ReporterConfig } from "allure-js-commons/sdk/reporter";

export const ALLURE_REPORT_SYSTEM_HOOK = "__allure_report_system_hook__";

export const ALLURE_REPORT_STEP_COMMAND = "__allure_report_step_command__";

export type AllureCypressConfig = ReporterConfig & {
  videoOnFailOnly?: boolean;
  stepsFromCommands?: Partial<AllureSpecState["config"]["stepsFromCommands"]>;
};

export type CypressSuite = Mocha.Suite & {
  id: string;
  parent: CypressSuite | undefined;
  tests: CypressTest[];
  suites: CypressSuite[];
};

export type CypressTest = Mocha.Test & {
  wallClockStartedAt?: Date;
  parent: CypressSuite | undefined;
};

export type CypressHook = Mocha.Hook & {
  hookId: string;
  hookName: string;
  parent: CypressSuite | undefined;
};

export type CypressCommand = {
  attributes: {
    name: string;
    id: string;
    args: any[];
  };
  state: "passed" | "failed" | "queued";
};

export type CupressRunStart = {
  type: "cypress_run_start";
  data: object;
};

export type CypressSuiteStartMessage = {
  type: "cypress_suite_start";
  data: {
    id: string;
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

export type CypressHookStartMessage = {
  type: "cypress_hook_start";
  data: {
    name: string;
    scopeType: "each" | "all";
    position: "before" | "after";
    start: number;
  };
};

export type CypressHookEndMessage = {
  type: "cypress_hook_end";
  data: {
    duration: number;
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
  data: {
    statusDetails?: StatusDetails;
  };
};

export type CypressTestPassMessage = {
  type: "cypress_test_pass";
  data: object;
};

export type CypressSkippedTestMessage = {
  type: "cypress_skipped_test";
  data: CypressTestStartMessage["data"] &
    CypressFailMessage["data"] &
    CypressTestEndMessage["data"] & {
      suites: string[];
    };
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
  | CupressRunStart
  | CypressSuiteStartMessage
  | CypressSuiteEndMessage
  | CypressHookStartMessage
  | CypressHookEndMessage
  | CypressTestStartMessage
  | CypressCommandStartMessage
  | CypressCommandEndMessage
  | CypressTestPassMessage
  | CypressFailMessage
  | CypressTestSkipMessage
  | CypressSkippedTestMessage
  | CypressTestEndMessage;

export type SpecContext = {
  specPath: string;
  package: string;
  test: string | undefined;
  fixture: string | undefined;
  commandSteps: string[];
  videoScope: string;
  suiteIdToScope: Map<string, string>;
  suiteScopeToId: Map<string, string>;
  suiteScopes: string[];
  testScope: string | undefined;
  suiteNames: string[];
  failed: boolean;
};

export type AllureSpecState = {
  config: {
    stepsFromCommands: {
      maxArgumentLength: number;
      maxArgumentDepth: number;
    };
  };
  initialized: boolean;
  testPlan: TestPlanV1 | null | undefined;
  messages: CypressMessage[];
  currentTest?: CypressTest;
};

export type AllureCypressTaskArgs = {
  absolutePath: string;
  messages: readonly CypressMessage[];
  isInteractive: boolean;
};

export type CypressSuiteFunction = (
  title: string,
  configOrFn?: Cypress.SuiteConfigOverrides | ((this: Mocha.Suite) => void),
  fn?: (this: Mocha.Suite) => void,
) => Mocha.Suite;

export type DirectHookImplementation = Mocha.AsyncFunc | ((this: Mocha.Context) => void);
export type HookImplementation = Mocha.Func | DirectHookImplementation;
