/// <reference types="node" />
/// <reference types="node" />
import { PathLike } from "fs";
import { Category, TestResult, TestResultContainer } from "../model";
import { AllureWriter } from "./AllureWriter";
export declare class MessageAllureWriter implements AllureWriter {
    writeAttachment(name: string, content: Buffer | string, encoding?: BufferEncoding): void;
    writeAttachmentFromPath(from: PathLike, distFileName: string): void;
    writeEnvironmentInfo(info?: Record<string, string | undefined>): void;
    writeCategoriesDefinitions(categories: Category[]): void;
    writeGroup(result: TestResultContainer): void;
    writeResult(result: TestResult): void;
}
