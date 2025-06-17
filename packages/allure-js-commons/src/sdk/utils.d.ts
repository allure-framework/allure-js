import type { FixtureResult, Label, Link, StatusDetails, StepResult, TestResult } from "../model.js";
import { LabelName, Status } from "../model.js";
import type { RuntimeMessage, SerializeOptions } from "./types.js";
export declare const getStatusFromError: (error: Partial<Error>) => Status;
/**
 * https://github.com/chalk/strip-ansi
 */
export declare const stripAnsi: (str: string) => string;
export declare const getMessageAndTraceFromError: (error: Error | {
    message?: string;
    stack?: string;
}) => StatusDetails;
type AllureTitleMetadataMatch = RegExpMatchArray & {
    groups: {
        type?: string;
        v1?: string;
        v2?: string;
        v3?: string;
        v4?: string;
    };
};
export declare const allureMetadataRegexp: RegExp;
export declare const allureTitleMetadataRegexp: RegExp;
export declare const allureTitleMetadataRegexpGlobal: RegExp;
export declare const allureIdRegexp: RegExp;
export declare const allureLabelRegexp: RegExp;
export declare const getTypeFromAllureTitleMetadataMatch: (match: AllureTitleMetadataMatch) => string;
export declare const getValueFromAllureTitleMetadataMatch: (match: AllureTitleMetadataMatch) => string;
export declare const isMetadataTag: (tag: string) => boolean;
export declare const getMetadataLabel: (tag: string, value?: string) => Label | undefined;
export declare const extractMetadataFromString: (title: string) => {
    labels: Label[];
    links: Link[];
    cleanTitle: string;
};
export declare const isAnyStepFailed: (item: StepResult | TestResult | FixtureResult) => boolean;
export declare const isAllStepsEnded: (item: StepResult | TestResult | FixtureResult) => boolean;
export declare const hasLabel: (testResult: TestResult, labelName: LabelName | string) => boolean;
export declare const hasStepMessage: (messages: RuntimeMessage[]) => boolean;
export declare const getStepsMessagesPair: (messages: RuntimeMessage[]) => RuntimeMessage[][];
export declare const getUnfinishedStepsMessages: (messages: RuntimeMessage[]) => RuntimeMessage[][];
export declare const isPromise: <T = any>(obj: any) => obj is PromiseLike<T>;
export declare const serialize: (value: any, { maxDepth, maxLength, replacer }?: SerializeOptions) => string;
export {};
