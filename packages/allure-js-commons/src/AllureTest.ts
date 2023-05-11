import { AllureRuntime } from "./AllureRuntime";
import { testResult } from "./constructors";
import { ExecutableItemWrapper } from "./ExecutableItemWrapper";
import { LinkType, TestResult } from "./model";
import { md5 } from "./utils";

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

  set testCaseId(testCaseId: string) {
    this.testResult.testCaseId = testCaseId;
  }

  addLabel(name: string, value: string): void {
    this.testResult.labels.push({ name, value });
  }

  addLink(url: string, name?: string, type?: string): void {
    this.testResult.links.push({ name, url, type });
  }

  addIssueLink(url: string, name: string): void {
    this.addLink(url, name, LinkType.ISSUE);
  }

  addTmsLink(url: string, name: string): void {
    this.addLink(url, name, LinkType.TMS);
  }

  calculateHistoryId(): void {
    const tcId = this.testResult.testCaseId
      ? this.testResult.testCaseId
      : this.testResult.fullName
      ? md5(this.testResult.fullName)
      : null;

    if (tcId) {
      const paramsString = this.testResult.parameters
        .filter((p) => !p?.excluded)
        .sort((a, b) => a.name?.localeCompare(b?.name) || a.value?.localeCompare(b?.value))
        .map((p) => `${p.name ?? "null"}:${p.value ?? "null"}`)
        .join(",");

      const paramsHash = md5(paramsString);
      this.historyId = `${tcId}:${paramsHash}`;
    }
  }
}
