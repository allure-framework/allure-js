import { Category, ContentType, TestResult, TestResultContainer } from "./model";
import { v4 as randomUUID } from "uuid";
import { IAllureConfig } from "./AllureConfig";
import { AllureGroup } from "./AllureGroup";
import { AllureWriter, IAllureWriter, typeToExtension } from "./writers";

export class AllureRuntime {
  private writer: IAllureWriter;

  constructor(private config: IAllureConfig) {
    this.writer = config.writer || new AllureWriter(config);
  }

  startGroup(name?: string): AllureGroup {
    const allureContainer = new AllureGroup(this);
    allureContainer.name = name || "Unnamed";
    return allureContainer;
  }

  writeResult(result: TestResult): void {
    const modifiedResult = this.config.testMapper !== undefined ? this.config.testMapper(result) : result;
    if (modifiedResult != null) {
      this.writer.writeResult(modifiedResult);
    }
  }

  writeGroup(result: TestResultContainer): void {
    this.writer.writeGroup(result);
  }

  writeAttachment(content: Buffer | string, contentType: ContentType): string {
    const extension = typeToExtension(contentType);
    const fileName = `${randomUUID()}-attachment.${extension}`;
    this.writer.writeAttachment(fileName, content);
    return fileName;
  }

  writeEnvironmentInfo(info?: Record<string, string>) {
    this.writer.writeEnvironmentInfo(info || process.env);
  }

  writeCategoriesDefinitions(categories: Category[]) {
    const serializedCategories = categories.map(c => {
      if (c.messageRegex instanceof RegExp) c.messageRegex = c.messageRegex.source;
      if (c.traceRegex instanceof RegExp) c.traceRegex = c.traceRegex.source;
      return c;
    });
    this.writer.writeCategoriesDefinitions(serializedCategories);
  }
}
