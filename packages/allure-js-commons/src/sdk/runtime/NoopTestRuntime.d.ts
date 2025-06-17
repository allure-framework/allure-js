import type { TestRuntime } from "./types.js";
export declare class NoopTestRuntime implements TestRuntime {
    attachment(): Promise<void>;
    attachmentFromPath(): Promise<void>;
    description(): Promise<void>;
    descriptionHtml(): Promise<void>;
    displayName(): Promise<void>;
    historyId(): Promise<void>;
    labels(): Promise<void>;
    links(): Promise<void>;
    parameter(): Promise<void>;
    logStep(): Promise<void>;
    step<T>(name: string, body: () => T | PromiseLike<T>): Promise<T>;
    stepDisplayName(): Promise<void>;
    stepParameter(): Promise<void>;
    testCaseId(): Promise<void>;
    warning(): Promise<void>;
}
export declare const noopRuntime: TestRuntime;
