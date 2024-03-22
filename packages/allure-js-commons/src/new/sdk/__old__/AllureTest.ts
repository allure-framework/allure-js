import { Executable, LinkType, MetadataMessage, TestResult } from "../model.js";
import { AllureCommandStepExecutable } from "./AllureCommandStep.js";
import { AllureExecutable } from "./AllureExecutable.js";
import { testResult } from "./AllureResults.js";
import { AllureRuntime } from "./AllureRuntime.js";

// import { getLabelsFromEnv } from "./utils";

export class AllureTest extends AllureExecutable {
  private readonly testResult: TestResult;
  private historyIdSetManually = false;
  runtime: AllureRuntime;

  constructor(runtime: AllureRuntime, start: number = Date.now()) {
    const result = testResult(runtime.crypto.uuid(), runtime.crypto.uuid());

    super(result);

    // TODO: create AllureTest for node or collect labels from env in runtime
    // const globalLabels = getLabelsFromEnv();

    this.runtime = runtime;
    this.testResult = this.wrappedItem as TestResult;
    this.testResult.start = start;

    // globalLabels.forEach((label) => this.addLabel(label.name, label.value));
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
    this.historyIdSetManually = true;
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

  /**
   * Calculates test `historyId` based on `testCaseId` and parameters
   * Does nothing if `historyId` is already set
   */
  calculateHistoryId(): void {
    if (this.historyIdSetManually) {
      return;
    }

    const tcId = this.testResult.testCaseId
      ? this.testResult.testCaseId
      : this.testResult.fullName
        ? this.runtime.crypto.md5(this.testResult.fullName)
        : null;

    if (!tcId) {
      return;
    }

    const paramsString = this.testResult.parameters
      .filter((p) => !p?.excluded)
      .sort((a, b) => a.name?.localeCompare(b?.name) || a.value?.localeCompare(b?.value))
      .map((p) => `${p.name ?? "null"}:${p.value ?? "null"}`)
      .join(",");
    const paramsHash = this.runtime.crypto.md5(paramsString);

    this.historyId = `${tcId}:${paramsHash}`;
  }

  /**
   * Processes metadata message recieved and applies all it's fields to the test
   *
   * @example
   * ```typescript
   * // apply entire metadata to the test
   * test.applyMetadata(metadata)
   *
   * // will apply everything except steps
   * test.applyMetadata(metadata, () => {})
   *
   * // will apply steps metadata to another test
   * testA.applyMetadata(step, () => {
   *  testB.addStep(step)
   * })
   * ```
   *
   * @param metadata Metadata message recieved from Allure Runtime API
   * @param stepApplyFn Function that processes metadata. By default, all the steps
   * will be added to the test
   */
  applyMetadata(metadata: Partial<MetadataMessage>, stepApplyFn?: (step: Executable) => void) {
    const {
      attachments = [],
      labels = [],
      links = [],
      parameter = [],
      steps = [],
      description,
      descriptionHtml,
      displayName,
      historyId,
      testCaseId,
    } = metadata;

    labels.forEach((label) => {
      this.addLabel(label.name, label.value);
    });
    links.forEach((link) => {
      this.addLink(link.url, link.name, link.type);
    });
    parameter.forEach((param) => {
      this.parameter(param.name, param.value, {
        excluded: param.excluded,
        mode: param.mode,
      });
    });
    attachments.forEach((attachment) => {
      const attachmentFilename = this.runtime.writeAttachment(attachment.content, attachment.type, attachment.encoding);

      this.addAttachment(
        attachment.name,
        {
          contentType: attachment.type,
        },
        attachmentFilename,
      );
    });

    if (description) {
      this.description = description;
    }

    if (descriptionHtml) {
      this.descriptionHtml = descriptionHtml;
    }

    if (displayName) {
      this.name = displayName;
    }

    if (testCaseId) {
      this.testCaseId = testCaseId;
    }

    if (historyId) {
      this.historyId = historyId;
    }

    steps.forEach((stepMetadata) => {
      const step = AllureCommandStepExecutable.toExecutableItem(this.runtime, stepMetadata);

      if (stepApplyFn) {
        stepApplyFn(step);
        return;
      }

      this.addStep(step);
    });
  }
}
