/// <reference types="node" />
/// <reference types="node" />
import { PathLike } from "fs";
import { Category, TestResult, TestResultContainer } from "../model";
import { AllureWriter } from "./AllureWriter";
export interface AllureResults {
    tests: TestResult[];
    groups: TestResultContainer[];
    attachments: Record<string, Buffer | string>;
    envInfo?: Record<string, string | undefined>;
    categories?: Category[];
}
export declare class InMemoryAllureWriter implements AllureWriter, AllureResults {
    groups: TestResultContainer[];
    tests: TestResult[];
    attachments: Record<string, Buffer | string>;
    categories?: Category[];
    envInfo?: Record<string, string | undefined>;
    writeGroup(result: TestResultContainer): void;
    writeResult(result: TestResult): void;
    writeAttachment(name: string, content: Buffer | string): void;
    writeAttachmentFromPath(from: PathLike, toFileName: string): void;
    writeCategoriesDefinitions(categories: Category[]): void;
    writeEnvironmentInfo(envInfo?: Record<string, string | undefined>): void;
    reset(): void;
    getMaybeTestByName(name: string): TestResult | undefined;
    getTestByName(name: string): TestResult;
    getMaybeGroupByName(name: string): TestResultContainer | undefined;
    getGroupByName(name: string): TestResultContainer;
}
