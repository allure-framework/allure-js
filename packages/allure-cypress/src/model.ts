import { MetadataMessage, AllureRuntime, MessageAllureWriter, AllureTest, Stage, Status, StatusDetails } from "allure-js-commons";

export type AllureCypressExecutableItem = {
  name: string;
  fullName: string;
  stage: Stage;
  status?: Status;
  statusDetails?: StatusDetails;
  start: number;
  stop?: number;
};
