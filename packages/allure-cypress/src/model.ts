import type { Stage, Status, StatusDetails } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";


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

export type CypressRuntimeMessage = RuntimeMessage | CypressTestStartRuntimeMessage | CypressTestEndRuntimeMessage;
