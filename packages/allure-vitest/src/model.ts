import {
  AttachmentOptions,
  MetadataMessage,
  ParameterOptions,
  Status,
  StatusDetails,
} from "allure-js-commons";

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

export interface AllureTest
  extends AllureStep,
    Pick<
      MetadataMessage,
      | "labels"
      | "links"
      | "parameter"
      | "description"
      | "descriptionHtml"
      | "historyId"
      | "testCaseId"
    > {}

export interface AllureMeta {
  currentTest: AllureTest;
  currentStep: AllureStep;
}

export interface AllureApi {
  label: (name: string, value: string) => void;
  epic: (epic: string) => void;
  feature: (feature: string) => void;
  story: (story: string) => void;
  suite: (name: string) => void;
  parentSuite: (name: string) => void;
  subSuite: (name: string) => void;
  owner: (owner: string) => void;
  severity: (severity: string) => void;
  layer: (layer: string) => void;
  id: (allureId: string) => void;
  tag: (tag: string) => void;
  parameter: (name: string, value: any, options?: ParameterOptions) => void;
  testCaseId: (id: string) => void;
  historyId: (id: string) => void;
  link: (url: string, name?: string, type?: string) => void;
  issue: (name: string, url: string) => void;
  tms: (name: string, url: string) => void;
  description: (markdown: string) => void;
  descriptionHtml: (html: string) => void;
  displayName: (name: string) => void;
  attachment: (name: string, content: Buffer | string, type: string) => void;
  step: (name: string, body: () => Promise<any>) => Promise<any>;
}
