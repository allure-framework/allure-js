import { PathLike } from "fs";
import { AllureResults, Category, TestResult, TestResultContainer } from "../../model.js";
import { Writer } from "../Writer.js";

export class AllureInMemoryAllureWriter implements Writer, AllureResults {
  public groups: TestResultContainer[] = [];
  public tests: TestResult[] = [];
  public attachments: Record<string, Buffer | string> = {};
  public categories?: Category[];
  public envInfo?: Record<string, string | undefined>;

  public writeGroup(result: TestResultContainer): void {
    this.groups.push(result);
  }

  public writeResult(result: TestResult): void {
    this.tests.push(result);
  }

  public writeAttachment(distFileName: string, content: Buffer | string): void {
    this.attachments[distFileName] = content;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public writeAttachmentFromPath(from: PathLike, distFileName: string): void {
    throw new Error(
      "Can't write attachment from path because generic writer doesn't implement this logic! Use AllureInMemoryWriter for node.js.",
    );
  }

  public writeCategoriesDefinitions(categories: Category[]): void {
    if (this.categories) {
      // eslint-disable-next-line no-console
      console.warn("overwriting existing categories");
    }
    this.categories = categories;
  }

  public writeEnvironmentInfo(envInfo?: Record<string, string | undefined>): void {
    if (this.envInfo) {
      // eslint-disable-next-line no-console
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
    return this.tests.find((t) => t.name === name);
  }

  public getTestByName(name: string): TestResult {
    const res: TestResult | undefined = this.getMaybeTestByName(name);
    if (!res) {
      throw new Error(`Test not found: ${name}`);
    }
    return res;
  }

  public getMaybeGroupByName(name: string): TestResultContainer | undefined {
    return this.groups.find((g) => g.name === name);
  }

  public getGroupByName(name: string): TestResultContainer {
    const res: TestResultContainer | undefined = this.getMaybeGroupByName(name);
    if (!res) {
      throw new Error(`Group not found: ${name}`);
    }
    return res;
  }
}
