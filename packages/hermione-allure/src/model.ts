import { MetadataMessage, Stage, Status, StatusDetails } from "allure-js-commons";
import { AllureWriter } from "allure-js-commons/dist/src/writers";

export type AllureReportOptions = {
  resultsDir?: string;
  writer?: AllureWriter;
};

export enum HermioneRuntimeMessageType {
  START_STEP = "START_STEP",
  END_STEP = "END_STEP",
  METADATA = "METADATA",
}

export type HermioneRuntimeBaseMessage = {
  testId: string;
};

export type HermioneMetadataMessage = HermioneRuntimeBaseMessage & {
  type: HermioneRuntimeMessageType.METADATA;
  metadata: MetadataMessage;
};

export type HermioneStartStepMessage = HermioneRuntimeBaseMessage & {
  type: HermioneRuntimeMessageType.START_STEP;
  name: string;
};

export type HermioneEndStepMessage = HermioneRuntimeBaseMessage & {
  type: HermioneRuntimeMessageType.END_STEP;
  status: Status;
  stage?: Stage;
  statusDetails?: StatusDetails;
};

export type HermioneRuntimeMessage = HermioneMetadataMessage | HermioneStartStepMessage | HermioneEndStepMessage;
