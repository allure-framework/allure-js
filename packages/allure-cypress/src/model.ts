import { MetadataMessage, Stage, Status, StatusDetails } from "allure-js-commons/new";

export enum MessageType {
  TEST_STARTED = "TEST_STARTED",
  TEST_ENDED = "TEST_ENDED",
  STEP_STARTED = "STEP_STARTED",
  STEP_ENDED = "STEP_ENDED",
  METADATA = "METADATA",
  SCREENSHOT = "SCREENSHOT",
}

export type TestStartMessage = {
  specPath: string[];
  filename: string;
  start: number;
};

export type TestEndMessage = {
  stage: Stage;
  status: Status;
  statusDetails?: StatusDetails;
  stop: number;
};

export type StepStartMessage = {
  type: MessageType.STEP_STARTED;
  payload: {
    name: string;
    start: number;
  };
};

export type StepEndMessage = {
  type: MessageType.STEP_ENDED;
  payload: {
    status: Status;
    statusDetails?: StatusDetails;
    stage?: Stage;
    stop: number;
  };
};

export type ScreenshotMessage = {
  type: MessageType.SCREENSHOT;
  payload: {
    path: string;
    name: string;
  };
};

export type MetadataSentMessage = {
  type: MessageType.METADATA;
  payload: MetadataMessage;
};

export type ReporterMessage = StepStartMessage | StepEndMessage | MetadataSentMessage | ScreenshotMessage;

export type ReportFinalMessage = {
  testFileAbsolutePath: string;
  isInteractive: boolean;
  startMessage: TestStartMessage;
  endMessage: TestEndMessage;
  messages: ReporterMessage[];
};
