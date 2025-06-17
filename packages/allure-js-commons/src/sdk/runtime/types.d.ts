import type { AttachmentOptions, Label, Link, ParameterMode, ParameterOptions, Status } from "../../model.js";
export interface TestRuntime {
    labels: (...labels: Label[]) => PromiseLike<void>;
    links: (...links: Link[]) => PromiseLike<void>;
    parameter: (name: string, value: string, options?: ParameterOptions) => PromiseLike<void>;
    description: (markdown: string) => PromiseLike<void>;
    descriptionHtml: (html: string) => PromiseLike<void>;
    displayName: (name: string) => PromiseLike<void>;
    historyId: (value: string) => PromiseLike<void>;
    testCaseId: (value: string) => PromiseLike<void>;
    attachment: (name: string, content: Buffer | string, options: AttachmentOptions) => PromiseLike<void>;
    attachmentFromPath: (name: string, path: string, options: Omit<AttachmentOptions, "encoding">) => PromiseLike<void>;
    logStep: (name: string, status?: Status, error?: Error) => PromiseLike<void>;
    step: <T = void>(name: string, body: () => T | PromiseLike<T>) => PromiseLike<T>;
    stepDisplayName: (name: string) => PromiseLike<void>;
    stepParameter: (name: string, value: string, mode?: ParameterMode) => PromiseLike<void>;
}
