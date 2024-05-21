import { PathLike, copyFileSync, existsSync, mkdirSync, writeFileSync } from "fs";
import { join } from "path";
import properties from "properties";
import { Category, TestResult, TestResultContainer } from "../../../model.js";
import { Writer } from "../../Writer.js";

const writeJson = (path: string, data: unknown): void => {
  writeFileSync(path, JSON.stringify(data), "utf8");
};

export class FileSystemAllureWriter implements Writer {
  constructor(private config: { resultsDir: string }) {
    // TODO: create results dir every time we write something
    if (!existsSync(this.config.resultsDir)) {
      mkdirSync(this.config.resultsDir, {
        recursive: true,
      });
    }
  }

  writeAttachment(distFileName: string, content: Buffer | string, encoding: BufferEncoding = "utf-8"): void {
    const path = this.buildPath(distFileName);

    writeFileSync(path, content, encoding);
  }

  writeAttachmentFromPath(from: PathLike, distFileName: string): void {
    const to = this.buildPath(distFileName);

    copyFileSync(from, to);
  }

  writeEnvironmentInfo(info?: Record<string, string | undefined>): void {
    const text = properties.stringify(info, { unicode: true }).toString();
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
