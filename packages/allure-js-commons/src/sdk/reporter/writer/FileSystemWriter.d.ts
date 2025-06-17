import type { TestResult, TestResultContainer } from "../../../model.js";
import type { Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
export declare class FileSystemWriter implements Writer {
    private config;
    constructor(config: {
        resultsDir: string;
    });
    writeAttachment(distFileName: string, content: Buffer): void;
    writeAttachmentFromPath(distFileName: string, from: string): void;
    writeEnvironmentInfo(info: EnvironmentInfo): void;
    writeCategoriesDefinitions(categories: Category[]): void;
    writeGroup(result: TestResultContainer): void;
    writeResult(result: TestResult): void;
    private buildPath;
}
