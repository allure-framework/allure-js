import { FullConfig } from "@playwright/test";
import { TestResult as PlaywrightTestResult, Reporter, Suite, TestCase, TestStep } from "@playwright/test/reporter";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import stripAnsi from "strip-ansi";
import { ContentType, ImageDiffAttachment } from "allure-js-commons";
import { ALLURE_IMAGEDIFF_CONTENT_TYPE, ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/new/internal";
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
  readImageAsBase64,
} from "allure-js-commons/new/sdk/node";
import { AllurePlaywrightReporterConfig } from "./model.js";
import { getStatusDetails, hasLabel, statusToAllureStats } from "./utils.js";

// TODO: move to utils.ts
const diffEndRegexp = /-((expected)|(diff)|(actual))\.png$/;
const stepAttachRegexp = /^allureattach_(\w{8}-\w{4}-\w{4}-\w{4}-\w{12})_/i;
// 12 (allureattach) + 1 (_) + 36 (uuid v4) + 1 (_)
const stepAttachPrefixLength = 50;

class AllureReporter implements Reporter {
  config!: FullConfig;
  suite!: Suite;
  options: AllurePlaywrightReporterConfig;

  private allureRuntime: AllureNodeReporterRuntime | undefined;
  private hostname: string = process.env.ALLURE_HOST_NAME || os.hostname();
  private globalStartTime = new Date();
  private processedDiffs: string[] = [];

  private readonly allureResultsUuids: Map<string, string> = new Map();

  constructor(config: AllurePlaywrightReporterConfig) {
    this.options = { suiteTitle: true, detail: true, ...config };
  }

  onBegin(config: FullConfig, suite: Suite): void {
    const writer = this.options.testMode
      ? new MessageAllureWriter()
      : new FileSystemAllureWriter({
          resultsDir: this.options.resultsDir || "./allure-results",
        });

    this.config = config;
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
    const fullName = `${relativeFile}#${nameSuites}${test.title}`;
    const result: Partial<TestResult> = {
      name: titleMetadata.cleanTitle,
      labels: titleMetadata.labels,
      links: [],
      parameters: [],
      testCaseId: this.allureRuntime!.crypto.md5(fullName),
      fullName,
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

    const testUuid = this.allureRuntime!.start(result);

    this.allureResultsUuids.set(test.id, testUuid as string);
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
      testUuid,
      {
        name: step.title.substring(0, stepAttachPrefixLength),
      },
      step.startTime.getTime(),
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

    this.allureRuntime!.updateStep(testUuid, (stepResult) => {
      // TODO: step can be broken
      stepResult.status = step.error ? Status.FAILED : Status.PASSED;
      stepResult.stage = Stage.FINISHED;

      if (step.error) {
        stepResult.statusDetails = getStatusDetails(step.error);
      }
    });
    this.allureRuntime!.stopStep(testUuid);
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

    this.allureRuntime!.update(testUuid, (testResult) => {
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
    });

    for (const attachment of result.attachments) {
      await this.processAttachment(test.id, attachment);
    }

    if (result.stdout.length > 0) {
      this.allureRuntime!.writeAttachment(testUuid, {
        name: "stdout",
        contentType: ContentType.TEXT,
        content: Buffer.from(stripAnsi(result.stdout.join("")), "utf8"),
      });
    }

    if (result.stderr.length > 0) {
      this.allureRuntime!.writeAttachment(testUuid, {
        name: "stderr",
        contentType: ContentType.TEXT,
        content: Buffer.from(stripAnsi(result.stderr.join("")), "utf8"),
      });
    }

    // FIXME: temp logic for labels override, we need it here to keep the reporter compatible with v2 API
    // in next iterations we need to implement the logic for every javascript integration
    this.allureRuntime!.update(testUuid, (testResult) => {
      const mappedLabels = testResult.labels.reduce(
        (acc, label) => {
          if (!acc[label.name]) {
            acc[label.name] = [];
          }

          acc[label.name].push(label);

          return acc;
        },
        {} as Record<string, Label[]>,
      );
      const newLabels = Object.keys(mappedLabels).flatMap((labelName) => {
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
    });

    this.allureRuntime!.stop(testUuid);
    this.allureRuntime!.write(testUuid);
  }

  addSkippedResults() {
    console.log("addSkippedResults", this.suite.allTests(), this.allureRuntime!.state.testResults);

    // const unprocessedCases = this.suite.allTests().filter((testCase) => !this.allureTestCache.has(testCase));
    //
    // unprocessedCases.forEach((testCase) => {
    //   this.onTestBegin(testCase);
    //   const allureTest = this.allureTestCache.get(testCase);
    //   if (allureTest) {
    //     allureTest.addLabel(LabelName.ALLURE_ID, "-1");
    //     allureTest.detailsMessage =
    //       "This test was skipped due to test setup error. Check you setup scripts to fix the issue.";
    //   }
    //
    //   this.onTestEnd(testCase, {
    //     status: Status.SKIPPED,
    //     attachments: [],
    //     duration: 0,
    //     errors: [],
    //     parallelIndex: 0,
    //     workerIndex: 0,
    //     retry: 0,
    //     steps: [],
    //     stderr: [],
    //     stdout: [],
    //     startTime: this.globalStartTime,
    //   });
    // });
  }

  onEnd(): void {
    this.addSkippedResults();

    if (this.options.environmentInfo) {
      this.allureRuntime?.writeEnvironmentInfo(this.options?.environmentInfo);
    }

    if (this.options.categories) {
      this.allureRuntime?.writeCategoriesDefinitions(this.options.categories);
    }
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
      this.allureRuntime!.applyRuntimeMessages(testUuid, [message]);
      return;
    }

    if (attachment.body) {
      this.allureRuntime!.writeAttachment(testUuid, {
        name: attachment.name,
        contentType: attachment.contentType,
        content: attachment.body,
      });
    } else if (!existsSync(attachment.path!)) {
      return;
    } else {
      this.allureRuntime!.writeAttachmentFromPath(testUuid, attachment.name, attachment.path!, {
        contentType: attachment.contentType,
      });
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

    this.allureRuntime!.writeAttachment(testUuid, {
      name: diffName,
      content: JSON.stringify({
        expected: expectedBase64,
        actual: actualBase64,
        diff: diffBase64,
        name: diffName,
      } as ImageDiffAttachment),
      contentType: ALLURE_IMAGEDIFF_CONTENT_TYPE,
      fileExtension: ".imagediff",
    });

    this.processedDiffs.push(pathWithoutEnd);
  }
}

export default AllureReporter;