import { Category, TestResult, TestResultContainer } from "../model";
import { IAllureWriter } from "./IAllureWriter";

export class InMemoryAllureWriter implements IAllureWriter {
  public groups: TestResultContainer[] = [];
  public tests: TestResult[] = [];
  public attachments: Record<string, Buffer | string> = {};
  public categories?: Category[];
  public envInfo?: Record<string, string | undefined>;

  public writeGroup(result: TestResultContainer) {
    this.groups.push(result);
  }

  public writeResult(result: TestResult): void {
    this.tests.push(result);
  }

  public writeAttachment(name: string, content: Buffer | string) {
    this.attachments[name] = content;
  }

  public writeCategoriesDefinitions(categories: Category[]) {
    if (this.categories) {
      console.warn("overwriting existing categories");
    }
    this.categories = categories;
  }

  public writeEnvironmentInfo(envInfo?: Record<string, string | undefined>) {
    if (this.envInfo) {
      console.warn("overwriting existing environment info");
    }
    this.envInfo = envInfo;
  }

  public reset(): void {
    this.groups = [];
    this.tests = [];
    this.attachments = {};
  }

  public getMaybeTestByName(name: string): TestResult | undefined {
    return this.tests.find(t => t.name === name);
  }

  public getTestByName(name: string): TestResult {
    const res = this.getMaybeTestByName(name);
    if (res === undefined) throw new Error(`Test not found: ${name}`);
    return res;
  }
}
