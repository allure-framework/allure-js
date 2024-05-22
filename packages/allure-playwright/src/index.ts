import { FullConfig } from "@playwright/test";
import {
  FullResult,
  TestResult as PlaywrightTestResult,
  Suite,
  TestCase,
  TestError,
  TestStep,
} from "@playwright/test/reporter";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import stripAnsi from "strip-ansi";
import { ContentType, ImageDiffAttachment } from "allure-js-commons";
import { ALLURE_IMAGEDIFF_CONTENT_TYPE, ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  AllureNodeReporterRuntime,
  FileSystemAllureWriter,
  Label,
  LabelName,
  MessageAllureWriter,
  RuntimeMessage,
  Stage,
  Status,
  TestResult,
  extractMetadataFromString,
  parseTestPlan,
  readImageAsBase64,
} from "allure-js-commons/sdk/node";
import { AllurePlaywrightReporterConfig } from "./model.js";
import { getStatusDetails, hasLabel, statusToAllureStats } from "./utils.js";

// TODO: move to utils.ts
const diffEndRegexp = /-((expected)|(diff)|(actual))\.png$/;
// 12 (allureattach) + 1 (_) + 36 (uuid v4) + 1 (_)
const stepAttachPrefixLength = 50;

interface ReporterV2 {
  onConfigure(config: FullConfig): void;
  onBegin(suite: Suite): void;
  onTestBegin(test: TestCase, result: PlaywrightTestResult): void;
  onStdOut(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;
  onStdErr(chunk: string | Buffer, test?: TestCase, result?: PlaywrightTestResult): void;
  onTestEnd(test: TestCase, result: PlaywrightTestResult): void;
  onEnd(result: FullResult): Promise<{ status?: FullResult["status"] } | undefined | void> | void;
  onExit(): void | Promise<void>;
  onError(error: TestError): void;
  onStepBegin(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;
  onStepEnd(test: TestCase, result: PlaywrightTestResult, step: TestStep): void;
  printsToStdio(): boolean;
  version(): "v2";
}

export class AllureReporter implements ReporterV2 {
  config!: FullConfig;
  suite!: Suite;
  options: AllurePlaywrightReporterConfig;

  private allureRuntime: AllureNodeReporterRuntime | undefined;
  private hostname: string = process.env.ALLURE_HOST_NAME || os.hostname();
  private globalStartTime = new Date();
  private processedDiffs: string[] = [];
  private readonly startedTestCasesTitlesCache: string[] = [];
  private readonly allureResultsUuids: Map<string, string> = new Map();

  constructor(config: AllurePlaywrightReporterConfig) {
    this.options = { suiteTitle: true, detail: true, ...config };
  }

  onConfigure(config: FullConfig): void {
    this.config = config;
    const testPlan = parseTestPlan();
    if (testPlan) {
      // @ts-ignore
      const configElement = config[Object.getOwnPropertySymbols(config)[0]];
      if (configElement) {
        configElement.cliArgs = testPlan.tests.filter((test) => test.selector).map((test) => test.selector);
      }
    }
  }

  onError(): void {}

  onExit(): void {}

  onStdErr(): void {}

  onStdOut(): void {}

  onBegin(suite: Suite): void {
    const writer = this.options.testMode
      ? new MessageAllureWriter()
      : new FileSystemAllureWriter({
          resultsDir: this.options.resultsDir || "./allure-results",
        });

    this.suite = suite;
    this.allureRuntime = new AllureNodeReporterRuntime({
      ...this.options,
      writer,
    });
  }

  onTestBegin(test: TestCase) {
    const suite = test.parent;
    const titleMetadata = extractMetadataFromString(test.title);
    const project = suite.project()!;
    const relativeFile = path.relative(project?.testDir, test.location.file).split(path.sep).join("/");
    // root > project > file path > test.describe...
    const [, , , ...suiteTitles] = suite.titlePath();
    const nameSuites = suiteTitles.length > 0 ? `${suiteTitles.join(" ")} ` : "";
    const testCaseIdBase = `${relativeFile}#${nameSuites}${test.title}`;
    const result: Partial<TestResult> = {
      name: titleMetadata.cleanTitle,
      labels: titleMetadata.labels,
      links: [],
      parameters: [],
      testCaseId: this.allureRuntime!.crypto.md5(testCaseIdBase),
      fullName: `${relativeFile}:${test.location.line}:${test.location.column}`,
    };

    result.labels!.push({ name: LabelName.LANGUAGE, value: "JavaScript" });
    result.labels!.push({ name: LabelName.FRAMEWORK, value: "Playwright" });
    result.labels!.push({ name: "titlePath", value: suite.titlePath().join(" > ") });

    if (project?.name) {
      result.parameters!.push({ name: "Project", value: project.name });
    }

    if (project?.repeatEach > 1) {
      result.parameters!.push({ name: "Repetition", value: `${test.repeatEachIndex + 1}` });
    }

    const testUuid = this.allureRuntime!.startTest(result);

    this.allureResultsUuids.set(test.id, testUuid as string);
    this.startedTestCasesTitlesCache.push(titleMetadata.cleanTitle as string);
  }

  onStepBegin(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    if (!this.options.detail && step.category !== "test.step") {
      return;
    }

    // ignore attach steps since attachments are already in the report
    if (step.category === "attach") {
      return;
    }

    const testUuid = this.allureResultsUuids.get(test.id)!;

    this.allureRuntime!.startStep(
      {
        name: step.title.substring(0, stepAttachPrefixLength),
        start: step.startTime.getTime(),
      },
      testUuid,
    );
  }

  onStepEnd(test: TestCase, _result: PlaywrightTestResult, step: TestStep): void {
    if (!this.options.detail && step.category !== "test.step") {
      return;
    }

    // ignore attach steps since attachments are already in the report
    if (step.category === "attach") {
      return;
    }

    const testUuid = this.allureResultsUuids.get(test.id)!;

    this.allureRuntime!.updateStep((stepResult) => {
      // TODO: step can be broken
      stepResult.status = step.error ? Status.FAILED : Status.PASSED;
      stepResult.stage = Stage.FINISHED;

      if (step.error) {
        stepResult.statusDetails = getStatusDetails(step.error);
      }
    }, testUuid);
    this.allureRuntime!.stopStep({ uuid: testUuid });
  }

  async onTestEnd(test: TestCase, result: PlaywrightTestResult) {
    const testUuid = this.allureResultsUuids.get(test.id)!;
    // We need to check parallelIndex first because pw introduced this field only in v1.30.0
    const threadId = result.parallelIndex !== undefined ? result.parallelIndex : result.workerIndex;
    const thread: string =
      process.env.ALLURE_THREAD_NAME || `${this.hostname}-${process.pid}-playwright-worker-${threadId}`;
    const error = result.error;
    // only apply default suites if not set by user
    const [, projectSuiteTitle, fileSuiteTitle, ...suiteTitles] = test.parent.titlePath();

    this.allureRuntime!.updateTest((testResult) => {
      testResult.labels.push({ name: LabelName.HOST, value: this.hostname });
      testResult.labels.push({ name: LabelName.THREAD, value: thread });

      if (projectSuiteTitle && !hasLabel(testResult, LabelName.PARENT_SUITE)) {
        testResult.labels.push({ name: LabelName.PARENT_SUITE, value: projectSuiteTitle });
      }

      if (this.options.suiteTitle && fileSuiteTitle && !hasLabel(testResult, LabelName.SUITE)) {
        testResult.labels.push({ name: LabelName.SUITE, value: fileSuiteTitle });
      }

      if (suiteTitles.length > 0 && !hasLabel(testResult, LabelName.SUB_SUITE)) {
        testResult.labels.push({ name: LabelName.SUB_SUITE, value: suiteTitles.join(" > ") });
      }

      if (error) {
        testResult.statusDetails = getStatusDetails(error);
      }

      testResult.status = statusToAllureStats(result.status, test.expectedStatus);
      testResult.stage = Stage.FINISHED;
    }, testUuid);

    for (const attachment of result.attachments) {
      await this.processAttachment(test.id, attachment);
    }

    if (result.stdout.length > 0) {
      this.allureRuntime!.writeAttachment(
        {
          name: "stdout",
          contentType: ContentType.TEXT,
          content: Buffer.from(stripAnsi(result.stdout.join("")), "utf8"),
        },
        testUuid,
      );
    }

    if (result.stderr.length > 0) {
      this.allureRuntime!.writeAttachment(
        {
          name: "stderr",
          contentType: ContentType.TEXT,
          content: Buffer.from(stripAnsi(result.stderr.join("")), "utf8"),
        },
        testUuid,
      );
    }

    // FIXME: temp logic for labels override, we need it here to keep the reporter compatible with v2 API
    // in next iterations we need to implement the logic for every javascript integration
    this.allureRuntime!.updateTest((testResult) => {
      const mappedLabels = testResult.labels.reduce<Record<string, Label[]>>((acc, label) => {
        if (!acc[label.name]) {
          acc[label.name] = [];
        }

        acc[label.name].push(label);

        return acc;
      }, {});
      const newLabels = Object.keys(mappedLabels as Record<string, Label[]>).flatMap((labelName) => {
        const labelsGroup = mappedLabels[labelName];

        if (
          labelName === LabelName.SUITE ||
          labelName === LabelName.PARENT_SUITE ||
          labelName === LabelName.SUB_SUITE
        ) {
          return labelsGroup.slice(-1);
        }

        return labelsGroup;
      });

      testResult.labels = newLabels;
    }, testUuid);

    this.allureRuntime!.stopTest({ uuid: testUuid });
    this.allureRuntime!.writeTest(testUuid);
  }

  async addSkippedResults() {
    const unprocessedCases = this.suite.allTests().filter(({ title }) => {
      const titleMetadata = extractMetadataFromString(title);

      return !this.startedTestCasesTitlesCache.includes(titleMetadata.cleanTitle as string);
    });

    for (const testCase of unprocessedCases) {
      this.onTestBegin(testCase);
      await this.onTestEnd(testCase, {
        status: Status.SKIPPED,
        attachments: [],
        duration: 0,
        errors: [],
        parallelIndex: 0,
        workerIndex: 0,
        retry: 0,
        steps: [],
        stderr: [],
        stdout: [],
        startTime: this.globalStartTime,
      });
    }
  }

  async onEnd() {
    await this.addSkippedResults();

    this.allureRuntime!.writeEnvironmentInfo();
    this.allureRuntime!.writeCategoriesDefinitions();
  }

  printsToStdio(): boolean {
    return false;
  }

  private async processAttachment(
    testId: string,
    attachment: {
      name: string;
      contentType: string;
      path?: string;
      body?: Buffer;
    },
  ) {
    const testUuid = this.allureResultsUuids.get(testId)!;

    if (!attachment.body && !attachment.path) {
      return;
    }

    const allureRuntimeMessage = attachment.contentType === ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE;

    if (allureRuntimeMessage && !attachment.body) {
      return;
    }

    if (allureRuntimeMessage) {
      const message = JSON.parse(attachment.body!.toString()) as RuntimeMessage;

      // TODO: make possible to pass single message and list of them
      this.allureRuntime!.applyRuntimeMessages([message], { testUuid });
      return;
    }

    if (attachment.body) {
      this.allureRuntime!.writeAttachment(
        {
          name: attachment.name,
          contentType: attachment.contentType,
          content: attachment.body,
        },
        testUuid,
      );
    } else if (!existsSync(attachment.path!)) {
      return;
    } else {
      this.allureRuntime!.writeAttachmentFromPath(
        attachment.name,
        attachment.path!,
        {
          contentType: attachment.contentType,
        },
        testUuid,
      );
    }

    if (!attachment.name.match(diffEndRegexp)) {
      return;
    }

    const pathWithoutEnd = attachment.path!.replace(diffEndRegexp, "");

    if (this.processedDiffs.includes(pathWithoutEnd)) {
      return;
    }

    const actualBase64 = await readImageAsBase64(`${pathWithoutEnd}-actual.png`);
    const expectedBase64 = await readImageAsBase64(`${pathWithoutEnd}-expected.png`);
    const diffBase64 = await readImageAsBase64(`${pathWithoutEnd}-diff.png`);
    const diffName = attachment.name.replace(diffEndRegexp, "");

    this.allureRuntime!.writeAttachment(
      {
        name: diffName,
        content: JSON.stringify({
          expected: expectedBase64,
          actual: actualBase64,
          diff: diffBase64,
          name: diffName,
        } as ImageDiffAttachment),
        contentType: ALLURE_IMAGEDIFF_CONTENT_TYPE,
        fileExtension: ".imagediff",
      },
      testUuid,
    );

    this.processedDiffs.push(pathWithoutEnd);
  }

  version(): "v2" {
    return "v2";
  }
}

/**
 * @deprecated for removal, import functions directly from "allure-js-commons".
 */
export * from "allure-js-commons";

/**
 * @deprecated for removal, import functions directly from "@playwright/test".
 */
export { test, expect } from "@playwright/test";

export default AllureReporter;
