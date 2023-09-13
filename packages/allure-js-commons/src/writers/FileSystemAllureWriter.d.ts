/// <reference types="node" />
/// <reference types="node" />
import { PathLike } from "fs";
import { AllureConfig } from "../AllureConfig";
import { Category, TestResult, TestResultContainer } from "../model";
import { AllureWriter } from "./AllureWriter";
export declare class FileSystemAllureWriter implements AllureWriter {
    private config;
    constructor(config: AllureConfig);
    writeAttachment(name: string, content: Buffer | string, encoding?: BufferEncoding): void;
    writeAttachmentFromPath(from: PathLike, distFileName: string): void;
    writeEnvironmentInfo(info?: Record<string, string | undefined>): void;
    writeCategoriesDefinitions(categories: Category[]): void;
    writeGroup(result: TestResultContainer): void;
    writeResult(result: TestResult): void;
    private buildPath;
}
