import { existsSync, writeFileSync } from "fs";
import { join } from "path";
import { sync as mkdirSync } from "mkdirp";
import { stringify } from "properties";
import { AllureConfig } from "../AllureConfig";
import { Category, TestResult, TestResultContainer } from "../model";
import { AllureWriter } from "./AllureWriter";

const writeJson = (path: string, data: unknown): void => {
  writeFileSync(path, JSON.stringify(data), { encoding: "utf-8" });
};

export class FileSystemAllureWriter implements AllureWriter {
  constructor(private config: AllureConfig) {
    if (!existsSync(this.config.resultsDir)) {
      mkdirSync(this.config.resultsDir);
    }
  }

  writeAttachment(name: string, content: Buffer | string): void {
    const path = this.buildPath(name);
    writeFileSync(path, content);
  }

  writeEnvironmentInfo(info?: Record<string, string | undefined>): void {
    const text = stringify(info, { unicode: true }).toString();
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
    return join(this.config.resultsDir, name);
  }
}
