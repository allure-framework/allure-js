import { IAllureConfig } from "./AllureConfig";
import { AllureGroup } from "./AllureGroup";
import { Category, ContentType, ExecutorInfo, TestResult, TestResultContainer } from "./model";
import { IAllureRuntime } from "./IAllureRuntime";

export class InMemoryAllureRuntime implements IAllureRuntime {
  constructor(public config: IAllureConfig) {

  }

  startGroup(name?: string): AllureGroup {
    const allureContainer = new AllureGroup(this);
    allureContainer.name = name || "Unnamed";
    return allureContainer;
  }

  writeAttachment(content: Buffer | string, contentType: ContentType): string {
    return "";
  }

  writeCategories(categories: Category[]): void {
  }

  writeEnvironmentInfo(info?: { [p: string]: string }): void {
  }

  writeExecutorInfo(info: ExecutorInfo): void {
  }

  public groups: TestResultContainer[] = [];

  writeGroup(result: TestResultContainer): void {
    this.groups.push(result);
  }

  public tests: TestResult[] = [];

  writeResult(result: TestResult): void {
    const res = this.config.testMapper !== undefined ? this.config.testMapper(result) : result;
    if (res !== null) this.tests.push(res);
  }

  public reset(): void {
    this.groups = [];
    this.tests = [];
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
