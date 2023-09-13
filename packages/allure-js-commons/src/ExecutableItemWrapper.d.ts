import { AttachmentOptions, ContentType, ExecutableItem, FixtureResult, ParameterOptions, Stage, Status, StatusDetails, StepResult, TestResult } from "./model";
export declare class ExecutableItemWrapper {
    private readonly info;
    constructor(info: FixtureResult | TestResult);
    get wrappedItem(): FixtureResult | TestResult;
    set name(name: string);
    set description(description: string | undefined);
    set descriptionHtml(descriptionHtml: string | undefined);
    set status(status: Status | undefined);
    get status(): Status | undefined;
    set statusDetails(details: StatusDetails);
    set detailsMessage(message: string | undefined);
    set detailsTrace(trace: string | undefined);
    set stage(stage: Stage);
    parameter(name: string, value: any, options?: ParameterOptions): void;
    get isAnyStepFailed(): boolean;
    get isAllStepsEnded(): boolean;
    addParameter(name: string, value: string, options?: ParameterOptions): void;
    addAttachment(name: string, options: ContentType | string | AttachmentOptions, fileName: string): void;
    startStep(name: string, start?: number): AllureStep;
    wrap<T>(fun: (...args: any[]) => T): (...args: any[]) => T;
    addStep(step: ExecutableItem): void;
}
export declare class AllureStep extends ExecutableItemWrapper {
    private readonly stepResult;
    constructor(stepResult: StepResult, start?: number);
    endStep(stop?: number): void;
}
