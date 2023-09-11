import { randomUUID } from "crypto";
import { PathLike } from "fs";
import { AllureConfig } from "./AllureConfig";
import { AllureGroup } from "./AllureGroup";
import { AttachmentOptions, Category, ContentType, TestResult, TestResultContainer } from "./model";
import { AllureWriter, FileSystemAllureWriter, typeToExtension } from "./writers";

const buildAttachmentFileName = (options: ContentType | string | AttachmentOptions): string => {
  if (typeof options === "string") {
    options = { contentType: options };
  }
  const extension = typeToExtension(options);
  return `${randomUUID()}-attachment${extension}`;
};

export class AllureRuntime {
  writer: AllureWriter;

  constructor(private config: AllureConfig) {
    this.writer = config.writer || new FileSystemAllureWriter(config);
  }

  startGroup(name?: string): AllureGroup {
    const allureContainer = new AllureGroup(this);
    allureContainer.name = name || "Unnamed";
    return allureContainer;
  }

  writeResult(result: TestResult): void {
    const modifiedResult =
      this.config.testMapper !== undefined ? this.config.testMapper(result) : result;
    if (modifiedResult != null) {
      this.writer.writeResult(modifiedResult);
    }
  }

  writeGroup(result: TestResultContainer): void {
    this.writer.writeGroup(result);
  }

  writeAttachment(
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
    encoding?: BufferEncoding,
  ): string {
    const fileName = buildAttachmentFileName(options);
    this.writer.writeAttachment(fileName, content, encoding);
    return fileName;
  }

  writeAttachmentFromPath(
    fromPath: PathLike,
    options: ContentType | string | AttachmentOptions,
  ): string {
    const fileName = buildAttachmentFileName(options);
    this.writer.writeAttachmentFromPath(fromPath, fileName);
    return fileName;
  }

  writeEnvironmentInfo(info?: Record<string, string>): void {
    this.writer.writeEnvironmentInfo(info || process.env);
  }

  writeCategoriesDefinitions(categories: Category[]): void {
    const serializedCategories = categories.map((c) => {
      if (c.messageRegex instanceof RegExp) {
        c.messageRegex = c.messageRegex.source;
      }
      if (c.traceRegex instanceof RegExp) {
        c.traceRegex = c.traceRegex.source;
      }
      return c;
    });
    this.writer.writeCategoriesDefinitions(serializedCategories);
  }
}
