import type {
  AttachmentOptions,
  Label,
  Link,
  ParameterMode,
  ParameterOptions,
  Status,
  StatusDetails,
} from "../../model.js";

export interface StepContext {
  displayName: (name: string) => void | PromiseLike<void>;

  parameter: (name: string, value: string, mode?: ParameterMode) => void | PromiseLike<void>;
}

export interface SyncStepContext {
  displayName: (name: string) => void;

  parameter: (name: string, value: string, mode?: ParameterMode) => void;
}

export interface SyncTestRuntime {
  labels: (...labels: Label[]) => void;

  links: (...links: Link[]) => void;

  parameter: (name: string, value: string, options?: ParameterOptions) => void;

  description: (markdown: string) => void;

  descriptionHtml: (html: string) => void;

  displayName: (name: string) => void;

  historyId: (value: string) => void;

  testCaseId: (value: string) => void;

  attachment: (name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) => void;

  globalAttachment: (name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) => void;

  globalAttachmentFromPath: (name: string, path: string, options: Omit<AttachmentOptions, "encoding">) => void;

  globalError: (details: StatusDetails) => void;

  attachmentFromPath: (name: string, path: string, options: Omit<AttachmentOptions, "encoding">) => void;

  logStep: (name: string, status?: Status, error?: Error) => void;

  step: <T = void>(name: string, body: () => T) => T;

  stepDisplayName: (name: string) => void;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => void;
}

export interface TestRuntime {
  labels: (...labels: Label[]) => PromiseLike<void>;

  links: (...links: Link[]) => PromiseLike<void>;

  parameter: (name: string, value: string, options?: ParameterOptions) => PromiseLike<void>;

  description: (markdown: string) => PromiseLike<void>;

  descriptionHtml: (html: string) => PromiseLike<void>;

  displayName: (name: string) => PromiseLike<void>;

  historyId: (value: string) => PromiseLike<void>;

  testCaseId: (value: string) => PromiseLike<void>;

  attachment: (name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) => PromiseLike<void>;

  globalAttachment: (
    name: string,
    content: Buffer | Uint8Array | string,
    options: AttachmentOptions,
  ) => PromiseLike<void>;

  globalAttachmentFromPath: (
    name: string,
    path: string,
    options: Omit<AttachmentOptions, "encoding">,
  ) => PromiseLike<void>;

  globalError: (details: StatusDetails) => PromiseLike<void>;

  attachmentFromPath: (name: string, path: string, options: Omit<AttachmentOptions, "encoding">) => PromiseLike<void>;

  logStep: (name: string, status?: Status, error?: Error) => PromiseLike<void>;

  stage: (name: string) => PromiseLike<void>;

  step: <T = void>(name: string, body: () => T | PromiseLike<T>) => PromiseLike<T>;

  stepDisplayName: (name: string) => PromiseLike<void>;

  stepParameter: (name: string, value: string, mode?: ParameterMode) => PromiseLike<void>;

  sync?: SyncTestRuntime;
}
