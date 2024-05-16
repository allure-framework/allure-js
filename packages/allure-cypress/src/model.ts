import { RuntimeMessage, Stage, Status, StatusDetails } from "allure-js-commons/sdk/browser";

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

export type CypressScreenshotRuntimeMessage = {
  type: "cypress_screenshot";
  data: {
    path: string;
    name: string;
  };
};

export type CypressRuntimeMessage =
  | RuntimeMessage
  | CypressScreenshotRuntimeMessage
  | CypressTestStartRuntimeMessage
  | CypressTestEndRuntimeMessage;
