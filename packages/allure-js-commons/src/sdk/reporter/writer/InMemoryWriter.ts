import { readFileSync } from "fs";
import type { TestResult, TestResultContainer } from "../../../model.js";
import type { AllureResults, Category, EnvironmentInfo } from "../../types.js";
import type { Writer } from "../types.js";

export class InMemoryWriter implements Writer, AllureResults {
  public groups: TestResultContainer[] = [];
  public tests: TestResult[] = [];
  public attachments: Record<string, Buffer> = {};
  public categories?: Category[];
  public envInfo?: Record<string, string | undefined>;

  public writeGroup(result: TestResultContainer): void {
    this.groups.push(result);
  }

  public writeResult(result: TestResult): void {
    this.tests.push(result);
  }

  public writeAttachment(distFileName: string, content: Buffer): void {
    this.attachments[distFileName] = content;
  }

  public writeAttachmentFromPath(distFileName: string, from: string): void {
    this.attachments[distFileName] = readFileSync(from);
  }

  public writeCategoriesDefinitions(categories: Category[]): void {
    this.categories = categories;
  }

  public writeEnvironmentInfo(envInfo: EnvironmentInfo): void {
    this.envInfo = envInfo;
  }
}
