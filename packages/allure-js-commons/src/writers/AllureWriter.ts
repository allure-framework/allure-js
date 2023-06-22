import { PathLike } from "fs";
import { Category, ExecutorInfo, TestResult, TestResultContainer } from "../model";

export interface AllureWriter {
  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(name: string, content: Buffer | string, encoding?: BufferEncoding): void;

  writeAttachmentFromPath(from: PathLike, distFileName: string): void;

  writeEnvironmentInfo(info: Record<string, string | undefined>): void;

  writeExecutorInfo(info: ExecutorInfo): void;

  writeCategoriesDefinitions(categories: Category[]): void;
}
