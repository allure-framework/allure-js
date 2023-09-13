/// <reference types="node" />
import { AllureRuntime } from "./AllureRuntime";
import { AttachmentMetadata, ContentType, ExecutableItem, MetadataMessage, ParameterOptions, StepMetadata } from "./model";
export type StepBodyFunction<T = any> = (this: AllureCommandStepExecutable, step: AllureCommandStepExecutable) => T | Promise<T>;
export interface AllureCommandStep<T = MetadataMessage> {
    name: string;
    attachments: AttachmentMetadata[];
    metadata: T;
    label(label: string, value: string): void | Promise<void>;
    link(url: string, name?: string, type?: string): void | Promise<void>;
    parameter(name: string, value: string, options?: ParameterOptions): void | Promise<void>;
    epic(epic: string): void | Promise<void>;
    feature(feature: string): void | Promise<void>;
    story(story: string): void | Promise<void>;
    suite(name: string): void | Promise<void>;
    parentSuite(name: string): void | Promise<void>;
    subSuite(name: string): void | Promise<void>;
    owner(owner: string): void | Promise<void>;
    severity(severity: string): void | Promise<void>;
    tag(tag: string): void | Promise<void>;
    issue(issue: string, url: string): void | Promise<void>;
    tms(issue: string, url: string): void | Promise<void>;
    attach(name: string, content: Buffer | string, options: ContentType | string): void | Promise<void>;
    description(content: string): void | Promise<void>;
}
export declare class AllureCommandStepExecutable implements AllureCommandStep {
    name: string;
    attachments: AttachmentMetadata[];
    metadata: MetadataMessage;
    constructor(name: string);
    static toExecutableItem(runtime: AllureRuntime, stepMetadata: StepMetadata): ExecutableItem;
    label(label: string, value: string): void;
    link(url: string, name?: string, type?: string): void;
    parameter(name: string, value: any, options?: ParameterOptions): void;
    epic(epic: string): void;
    feature(feature: string): void;
    story(story: string): void;
    suite(name: string): void;
    parentSuite(name: string): void;
    subSuite(name: string): void;
    owner(owner: string): void;
    severity(severity: string): void;
    tag(tag: string): void;
    issue(name: string, url: string): void;
    tms(name: string, url: string): void;
    attach(content: string | Buffer, type: string): void;
    description(content: string): void;
    step(name: string, body: StepBodyFunction): Promise<void>;
    start(body: StepBodyFunction): Promise<MetadataMessage>;
    run(body: StepBodyFunction, messageEmitter: (message: MetadataMessage) => Promise<void>): Promise<void>;
}
