/// <reference types="node" />
/// <reference types="node" />
import { PathLike } from "fs";
import { Category, TestResult, TestResultContainer } from "../model";
export interface AllureWriter {
    writeResult(result: TestResult): void;
    writeGroup(result: TestResultContainer): void;
    writeAttachment(name: string, content: Buffer | string, encoding?: BufferEncoding): void;
    writeAttachmentFromPath(from: PathLike, distFileName: string): void;
    writeEnvironmentInfo(info: Record<string, string | undefined>): void;
    writeCategoriesDefinitions(categories: Category[]): void;
}
