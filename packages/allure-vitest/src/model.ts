import { AttachmentOptions, Status, StatusDetails } from "allure-js-commons";

export interface AllureAttachment {
  name: string;
  contentType: string;
  fileExtension?: string;
  content: Buffer | string;
}

export interface AllureStep {
  name: string;
  start?: number;
  stop?: number;
  status?: Status;
  attachments: AllureAttachment[];
  steps: AllureStep[];
  statusDetails?: StatusDetails;
}

export interface AllureTest extends AllureStep {
  labels: { name: string; value: string }[];
}

export interface AllureMeta {
  currentTest: AllureTest;
  currentStep: AllureStep;
}

export interface AllureApi {
  label: (name: string, value: string) => void;
  attachment: (name: string, content: Buffer | string, options: string | AttachmentOptions) => void;
  step: <T>(name: string, body: () => Promise<T>) => Promise<T>;
}
