import { type AttachmentOptions, type FixtureResult, type Label, type StepResult, type TestResult } from "../../model.js";
import type { Category, EnvironmentInfo, RuntimeMessage } from "../types.js";
import type { FixtureType, LinkConfig, ReporterRuntimeConfig, TestScope, Writer } from "./types.js";
export interface StepStack {
    clear(): void;
    removeRoot(rootUuid: string): void;
    currentStep(rootUuid: string): string | undefined;
    addStep(rootUuid: string, stepUuid: string): void;
    removeStep(stepUuid: string): void;
}
/**
 * Simpler steps stack implementation that contains only the current steps without root nodes
 * Useful, when you need to create steps without binding them to a specific test or fixture
 * @example
 * ```js
 * const stack = new ShallowStepsStack();
 *
 * stack.startStep({ name: "step 1" });
 * stack.startStep({ name: "step 1.1" });
 * stack.stopStep({ status: Status.FAILED });
 * stack.stopStep({ status: Status.PASSED });
 * stack.steps // => [{ name: "step 1", status: Status.PASSED, steps: [{ name: "step 1.1", status: Status.FAILED }] }]
 * ```
 */
export declare class ShallowStepsStack {
    #private;
    steps: StepResult[];
    currentStep(): StepResult;
    startStep(step: Partial<StepResult>): void;
    updateStep(updateFunc: (result: StepResult) => void): void;
    stopStep(opts?: {
        stop?: number;
        duration?: number;
    }): void;
    findStepByUuid(uuid: string): StepResult | undefined;
    addAttachment(attachment: AttachmentOptions, writer: Writer): string;
}
export declare class DefaultStepStack implements StepStack {
    private stepsByRoot;
    private rootsByStep;
    clear: () => void;
    removeRoot: (rootUuid: string) => void;
    currentStep: (rootUuid: string) => string | undefined;
    addStep: (rootUuid: string, stepUuid: string) => void;
    removeStep(stepUuid: string): void;
}
export declare class ReporterRuntime {
    #private;
    private readonly state;
    private notifier;
    private stepStack;
    writer: Writer;
    categories?: Category[];
    environmentInfo?: EnvironmentInfo;
    linkConfig?: LinkConfig;
    globalLabels: Label[];
    constructor({ writer, listeners, environmentInfo, categories, links, globalLabels, }: ReporterRuntimeConfig);
    startScope: () => string;
    updateScope: (uuid: string, updateFunc: (scope: TestScope) => void) => void;
    writeScope: (uuid: string) => void;
    startFixture: (scopeUuid: string, type: FixtureType, fixtureResult: Partial<FixtureResult>) => string | undefined;
    updateFixture: (uuid: string, updateFunc: (result: FixtureResult) => void) => void;
    stopFixture: (uuid: string, opts?: {
        stop?: number;
        duration?: number;
    }) => void;
    startTest: (result: Partial<TestResult>, scopeUuids?: string[]) => string;
    updateTest: (uuid: string, updateFunc: (result: TestResult) => void) => void;
    stopTest: (uuid: string, opts?: {
        stop?: number;
        duration?: number;
    }) => void;
    writeTest: (uuid: string) => void;
    currentStep: (rootUuid: string) => string | undefined;
    startStep: (rootUuid: string, parentStepUuid: string | null | undefined, result: Partial<StepResult>) => string | undefined;
    updateStep: (uuid: string, updateFunc: (stepResult: StepResult) => void) => void;
    stopStep: (uuid: string, opts?: {
        stop?: number;
        duration?: number;
    }) => void;
    writeAttachment: (rootUuid: string, parentStepUuid: string | null | undefined, attachmentName: string, attachmentContentOrPath: Buffer | string, options: AttachmentOptions & {
        wrapInStep?: boolean;
        timestamp?: number;
    }) => void;
    writeEnvironmentInfo: () => void;
    writeCategoriesDefinitions: () => void;
    applyRuntimeMessages: (rootUuid: string, messages: RuntimeMessage[]) => void;
}
