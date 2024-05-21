import { Category, TestResult, TestResultContainer } from "../model.js";

export interface Writer {
  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(distFileName: string, content: Buffer | string, encoding?: BufferEncoding): void;

  writeAttachmentFromPath(from: string, distFileName: string): void;

  writeEnvironmentInfo(info: Record<string, string | undefined>): void;

  writeCategoriesDefinitions(categories: Category[]): void;
}
