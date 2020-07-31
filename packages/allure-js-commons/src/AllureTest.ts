import { ExecutableItemWrapper } from "./ExecutableItemWrapper";
import { TestResult } from "./model";
import { testResult } from "./constructors";
import { AllureRuntime } from "./AllureRuntime";

export class AllureTest extends ExecutableItemWrapper {
  private readonly testResult: TestResult;

  constructor(private readonly runtime: AllureRuntime, start: number = Date.now()) {
    super(testResult());
    this.testResult = this.wrappedItem as TestResult;
    this.testResult.start = start;
  }

  endTest(stop: number = Date.now()): void {
    this.testResult.stop = stop;
    this.runtime.writeResult(this.testResult);
    // TODO: test that child steps ended
  }

  get uuid(): string {
    return this.testResult.uuid;
  }

  set historyId(id: string) {
    this.testResult.historyId = id;
  }

  set fullName(fullName: string) {
    this.testResult.fullName = fullName;
  }

  addLabel(name: string, value: string): void {
    this.testResult.labels.push({ name, value });
  }

  addLink(url: string, name?: string, type?: string): void {
    this.testResult.links.push({ name, url, type });
  }
}
