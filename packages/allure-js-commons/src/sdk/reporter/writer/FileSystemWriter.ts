import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { TestResult, TestResultContainer } from "../../../model.js";
import type { Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";
import { stringifyProperties } from "../utils.js";

const writeJson = (path: string, data: unknown): void => {
  writeFileSync(path, JSON.stringify(data), "utf-8");
};

export class FileSystemWriter implements Writer {
  constructor(private config: { resultsDir: string }) {}

  writeAttachment(distFileName: string, content: Buffer): void {
    const path = this.buildPath(distFileName);

    writeFileSync(path, content, "utf-8");
  }

  writeAttachmentFromPath(distFileName: string, from: string): void {
    const to = this.buildPath(distFileName);

    copyFileSync(from, to);
  }

  writeEnvironmentInfo(info: EnvironmentInfo): void {
    const text = stringifyProperties(info);
    const path = this.buildPath("environment.properties");

    writeFileSync(path, text);
  }

  writeCategoriesDefinitions(categories: Category[]): void {
    const path = this.buildPath("categories.json");

    writeJson(path, categories);
  }

  writeGroup(result: TestResultContainer): void {
    const path = this.buildPath(`${result.uuid}-container.json`);
    writeJson(path, result);
  }

  writeResult(result: TestResult): void {
    const path = this.buildPath(`${result.uuid}-result.json`);
    writeJson(path, result);
  }

  private buildPath(name: string): string {
    mkdirSync(this.config.resultsDir, {
      recursive: true,
    });
    return join(this.config.resultsDir, name);
  }
}
