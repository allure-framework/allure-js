import { Attachment, RawAttachment, ContentType, Label, Link, Parameter, Stage, Status, StatusDetails } from "../model.js";

export interface RuntimeMetadataMessage {
  type: "metadata";
  data: {
    labels?: Label[];
    links?: Link[];
    parameters?: Parameter[];
    attachments?: Attachment[];
    description?: string;
    descriptionHtml?: string;
    testCaseId?: string;
    historyId?: string;
    displayName?: string;
  };
}

export interface RuntimeStartStepMessage {
  type: "step_start";
  data: {
    name: string;
    start: number;
  };
}

export interface RuntimeStopStepMessage {
  type: "step_stop";
  data: {
    stop: number;
    status: Status;
    stage: Stage;
    statusDetails?: StatusDetails;
  };
}

// use to send whole attachment to ReporterRuntime and write it on the node side
export interface RuntimeRawAttachmentMessage {
  type: "raw_attachment";
  data: RawAttachment;
}

export type RuntimeMessage =
  | RuntimeMetadataMessage
  | RuntimeStartStepMessage
  | RuntimeStopStepMessage
  | RuntimeRawAttachmentMessage;
