import type { Stage, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";

// TODO: report cypress commands

export const ALLURE_REPORT_INSTALL_HOOK = "__allure_report_install_hook__";

export type CypressTest = Mocha.Test & {
  // wallClockDuration?: number
  wallClockStartedAt?: Date
}

export type CypressHook = {
  name: string;
  type: "before" | "after"
  status: Status;
  statusDetails?: StatusDetails;
}

export type CypressSuiteStartRuntimeMessage = {
  type: "cypress_suite_start"
  data: {
    name: string
  }
}

export type CypressSuiteEndRuntimeMessage = {
  type: "cypress_suite_end",
  data: {
    hooks: CypressHook[]
  }
}

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

export type CypressRuntimeMessage =
  | RuntimeMessage
  | CypressTestStartRuntimeMessage
  | CypressTestEndRuntimeMessage
  | CypressSuiteStartRuntimeMessage
  | CypressSuiteEndRuntimeMessage;
