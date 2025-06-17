import type { TestResult, TestResultContainer } from "../../../model.js";
import type { AllureResults, Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
export declare class InMemoryWriter implements Writer, AllureResults {
    groups: TestResultContainer[];
    tests: TestResult[];
    attachments: Record<string, Buffer>;
    categories?: Category[];
    envInfo?: Record<string, string | undefined>;
    writeGroup(result: TestResultContainer): void;
    writeResult(result: TestResult): void;
    writeAttachment(distFileName: string, content: Buffer): void;
    writeAttachmentFromPath(distFileName: string, from: string): void;
    writeCategoriesDefinitions(categories: Category[]): void;
    writeEnvironmentInfo(envInfo: EnvironmentInfo): void;
}
