import { GlobalInfoWriter } from "./GlobalInfoWriter";
import { AllureGroup } from "./AllureGroup";
import { Category, ContentType, ExecutorInfo, TestResult, TestResultContainer } from "./model";

export interface IAllureRuntime extends GlobalInfoWriter {
  startGroup(name?: string): AllureGroup;

  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(content: Buffer | string, contentType: ContentType): string;

  writeExecutorInfo(info: ExecutorInfo): void;

  writeEnvironmentInfo(info?: { [key: string]: string }): void;

  writeCategories(categories: Category[]): void;
}
