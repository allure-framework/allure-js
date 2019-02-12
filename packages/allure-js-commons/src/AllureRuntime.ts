import { Category, ExecutorInfo, TestResult, TestResultContainer } from "./model";
import { existsSync, writeFileSync } from "fs";
import { sync as mkdirSync } from "mkdirp";
import { join as buildPath } from "path";
import { v4 as randomUUID } from "uuid";
import { stringify } from "properties";
import { ContentType } from "./model";
import { IAllureConfig } from "./AllureConfig";
import { AllureGroup } from "./AllureGroup";
import { GlobalInfoWriter } from "./GlobalInfoWriter";

function typeToExtension(type: ContentType): string {
  switch (type) {
    case ContentType.TEXT:
      return "txt";
    case ContentType.XML:
      return "xml";
    case ContentType.CSV:
      return "csv";
    case ContentType.TSV:
      return "tsv";
    case ContentType.CSS:
      return "css";
    case ContentType.URI:
      return "uri";
    case ContentType.SVG:
      return "svg";
    case ContentType.PNG:
      return "png";
    case ContentType.JSON:
      return "json";
    case ContentType.WEBM:
      return "webm";
    case ContentType.JPEG:
      return "jpg";
  }
  throw new Error(`Unrecognized extension: ${type}`);
}

export class AllureRuntime implements GlobalInfoWriter {
  private config: IAllureConfig;

  constructor(config: IAllureConfig) {
    this.config = config;
    if (!existsSync(this.config.resultsDir)) mkdirSync(this.config.resultsDir);
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
      const path = buildPath(this.config.resultsDir, `${modifiedResult.uuid}-result.json`);
      writeFileSync(path, JSON.stringify(modifiedResult), { encoding: "utf-8" });
    }
  }

  writeGroup(result: TestResultContainer): void {
    const path = buildPath(this.config.resultsDir, `${result.uuid}-container.json`);
    writeFileSync(path, JSON.stringify(result), { encoding: "utf-8" });
  }

  writeAttachment(content: Buffer | string, contentType: ContentType): string {
    const extension = typeToExtension(contentType);
    const fileName = `${randomUUID()}-attachment.${extension}`;
    const path = buildPath(this.config.resultsDir, fileName);
    writeFileSync(path, content, { encoding: "utf-8" });
    return fileName;
  }

  writeExecutorInfo(info: ExecutorInfo) {
    const path = buildPath(this.config.resultsDir, "executor.json");
    writeFileSync(path, JSON.stringify(info), { encoding: "utf-8" });
  }

  writeEnvironmentInfo(info?: { [key: string]: string }) {
    const path = buildPath(this.config.resultsDir, "environment.properties");
    const target = info || process.env;
    const text = stringify(target, { unicode: true });
    writeFileSync(path, text, { encoding: "utf-8" });
  }

  writeCategories(categories: Category[]) {
    const path = buildPath(this.config.resultsDir, "categories.json");
    writeFileSync(path, JSON.stringify(categories.map(c => {
      if (c.messageRegex instanceof RegExp) c.messageRegex = c.messageRegex.source;
      if (c.traceRegex instanceof RegExp) c.traceRegex = c.traceRegex.source;
      return c;
    })), { encoding: "utf-8" });
  }
}
