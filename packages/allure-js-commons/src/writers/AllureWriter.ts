import { join } from "path";
import { sync as mkdirSync } from "mkdirp";
import { existsSync, writeFileSync } from "fs";
import { Category, TestResult, TestResultContainer } from "../model";
import { IAllureWriter } from "./IAllureWriter";
import { IAllureConfig } from "../AllureConfig";
import { stringify } from "properties";

function writeJson(path: string, data: object) {
  writeFileSync(path, JSON.stringify(data), { encoding: "utf-8" });
}

export class AllureWriter implements IAllureWriter {
  constructor(private config: IAllureConfig) {
    if (!existsSync(this.config.resultsDir)) {
      mkdirSync(this.config.resultsDir);
    }
  }

  private buildPath(name: string) {
    return join(this.config.resultsDir, name);
  }

  writeAttachment(name: string, content: Buffer | string) {
    const path = this.buildPath(name);
    writeFileSync(path, content);
  }

  writeEnvironmentInfo(info?: Record<string, string | undefined>) {
    const text = stringify(info, { unicode: true });
    const path = this.buildPath("environment.properties");
    writeFileSync(path, text);
  }

  writeCategoriesDefinitions(categories: Category[]) {
    const path = this.buildPath("categories.json");
    writeJson(path, categories);
  }

  writeGroup(result: TestResultContainer) {
    const path = this.buildPath(`${result.uuid}-container.json`);
    writeJson(path, result);
  }

  writeResult(result: TestResult) {
    const path = this.buildPath(`${result.uuid}-result.json`);
    writeJson(path, result);
  }
}
