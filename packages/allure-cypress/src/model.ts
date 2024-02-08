import { Stage, Status, StatusDetails } from "allure-js-commons";

export type StartTestMessage = {
  specPath: string[];
  filename: string;
  start: number;
};

export type EndTestMessage = {
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  stop: number;
};
