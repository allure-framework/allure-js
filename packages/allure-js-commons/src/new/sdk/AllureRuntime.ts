import { AttachmentOptions, Category, ContentType, Crypto, TestResult, TestResultContainer } from "../model.js";
import { typeToExtension } from "../utils.js";
import { AllureConfig } from "./AllureConfig.js";
import { AllureGroup } from "./AllureGroup.js";
import { AllureWriter } from "./AllureWriter.js";

export interface AllureRuntime {
  writer: AllureWriter;

  crypto: Crypto;

  startGroup(name?: string): AllureGroup;

  buildAttachmentFileName(options: ContentType | string | AttachmentOptions): string;

  writeResult(result: TestResult): void;

  writeGroup(result: TestResultContainer): void;

  writeAttachment(
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
    encoding?: BufferEncoding,
  ): string;

  writeEnvironmentInfo(info?: Record<string, string>): void;

  writeCategoriesDefinitions(categories: Category[]): void;
}

export abstract class AllureBaseRuntime implements AllureRuntime {
  writer: AllureWriter;

  crypto: Crypto;

  constructor(
    private config: AllureConfig,
    crypto: Crypto,
  ) {
    this.writer = config.writer;
    this.crypto = crypto;
  }

  startGroup(name?: string): AllureGroup {
    const allureContainer = new AllureGroup(this);

    allureContainer.name = name || "Unnamed";

    return allureContainer;
  }

  buildAttachmentFileName(options: ContentType | string | AttachmentOptions): string {
    if (typeof options === "string") {
      options = { contentType: options };
    }

    const extension = typeToExtension(options);

    return `${this.crypto.uuid()}-attachment${extension}`;
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

  writeAttachment(
    content: Buffer | string,
    options: ContentType | string | AttachmentOptions,
    encoding?: BufferEncoding,
  ): string {
    const fileName = this.buildAttachmentFileName(options);

    this.writer.writeAttachment(fileName, content, encoding);

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
