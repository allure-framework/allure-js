/**
 * Copyright (c) Microsoft Corporation.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from "fs";
import os from "os";
import path from "path";
import process from "process";
import { FullConfig, TestStatus } from "@playwright/test";
import {
  Reporter,
  Suite,
  TestCase,
  TestError,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";
import {
  AllureGroup,
  allureReportFolder,
  AllureRuntime,
  AllureStep,
  AllureTest,
  Category,
  ExecutableItemWrapper,
  ImageDiffAttachment,
  LabelName,
  md5,
  MessageAllureWriter,
  MetadataMessage,
  readImageAsBase64,
  Status,
  StatusDetails,
  stripAscii,
} from "allure-js-commons";
import {
  ALLURE_IMAGEDIFF_CONTENT_TYPE,
  ALLURE_METADATA_CONTENT_TYPE,
} from "allure-js-commons/internal";
import { extractMetadataFromString } from "./utils";

export type AllureReporterOptions = {
  detail?: boolean;
  outputFolder?: string;
  suiteTitle?: boolean;
  categories?: Category[];
  environmentInfo?: Record<string, string>;
};

class AllureReporter implements Reporter {
  config!: FullConfig;
  suite!: Suite;
  resultsDir!: string;
  options: AllureReporterOptions;

  private allureWriter = process.env.PW_ALLURE_POST_PROCESSOR_FOR_TEST
    ? new MessageAllureWriter()
    : undefined;

  private allureRuntime: AllureRuntime | undefined;
  private allureGroupCache = new Map<Suite, AllureGroup>();
  private allureTestCache = new Map<TestCase, AllureTest>();
  private allureStepCache = new Map<TestStep, AllureStep>();
  private hostname = process.env.ALLURE_HOST_NAME || os.hostname();
  private globalStartTime = new Date();

  private processedDiffs: string[] = [];

  constructor(options: AllureReporterOptions = { suiteTitle: true, detail: true }) {
    this.options = options;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.resultsDir = allureReportFolder(this.options.outputFolder);
    this.allureRuntime = new AllureRuntime({
      resultsDir: this.resultsDir,
      writer: this.allureWriter,
    });
  }

  onTestBegin(test: TestCase): void {
    const suite = test.parent;
    const group = this.ensureAllureGroupCreated(suite);
    const allureTest = group.startTest(test.title);
    allureTest.addLabel(LabelName.LANGUAGE, "JavaScript");
    allureTest.addLabel(LabelName.FRAMEWORK, "Playwright");

    const titleMetadata = extractMetadataFromString(test.title);
    titleMetadata.labels.forEach((label) => allureTest.addLabel(label.name, label.value));

    const [, projectSuiteTitle, fileSuiteTitle, ...suiteTitles] = suite.titlePath();
    allureTest.addLabel("titlePath", suite.titlePath().join(" > "));

    if (projectSuiteTitle) {
      allureTest.addLabel(LabelName.PARENT_SUITE, projectSuiteTitle);
    }
    if (this.options.suiteTitle && fileSuiteTitle) {
      allureTest.addLabel(LabelName.SUITE, fileSuiteTitle);
    }
    if (suiteTitles.length > 0) {
      allureTest.addLabel(LabelName.SUB_SUITE, suiteTitles.join(" > "));
    }
    const project = suite.project()!;
    if (project?.name) {
      allureTest.parameter("Project", project.name);
    }
    if (project.repeatEach > 1) {
      allureTest.parameter("Repetition", `${test.repeatEachIndex + 1}`);
    }

    const relativeFile = path
      .relative(project?.testDir, test.location.file)
      .split(path.sep)
      .join("/");

    const nameSuites = suiteTitles.length > 0 ? `${suiteTitles.join(" ")} ` : "";
    const fullName = `${relativeFile}#${nameSuites}${test.title}`;
    const testCaseIdSource = `${relativeFile}#${test.title}`;

    allureTest.fullName = fullName;
    allureTest.testCaseId = md5(testCaseIdSource);
    this.allureTestCache.set(test, allureTest);
  }

  onStepBegin(test: TestCase, _result: TestResult, step: TestStep): void {
    const allureTest = this.allureTestCache.get(test);
    if (!allureTest) {
      return;
    }
    if (!this.options.detail && step.category !== "test.step") {
      return;
    }
    this.ensureAllureStepCreated(step, allureTest);
  }

  onStepEnd(_test: TestCase, _result: TestResult, step: TestStep): void {
    const allureStep = this.allureStepCache.get(step);
    if (!allureStep) {
      return;
    }
    if (!this.options.detail && step.category !== "test.step") {
      return;
    }
    allureStep.endStep();
    allureStep.status = step.error ? Status.FAILED : Status.PASSED;
    if (step.error) {
      allureStep.statusDetails = getStatusDetails(step.error);
    }
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    const runtime = this.getAllureRuntime();
    const allureTest = this.allureTestCache.get(test);

    if (!allureTest) {
      return;
    }

    // We need to check parallelIndex first because pw introduced this field only in v1.30.0
    const threadId = result.parallelIndex !== undefined ? result.parallelIndex : result.workerIndex;

    const thread =
      process.env.ALLURE_THREAD_NAME ||
      `${this.hostname}-${process.pid}-playwright-worker-${threadId}`;

    allureTest.addLabel(LabelName.HOST, this.hostname);
    allureTest.addLabel(LabelName.THREAD, thread);

    allureTest.status = statusToAllureStats(result.status, test.expectedStatus);
    const error = result.error;
    if (error) {
      allureTest.statusDetails = getStatusDetails(error);
    }
    for (const attachment of result.attachments) {
      if (!attachment.body && !attachment.path) {
        continue;
      }

      if (attachment.contentType === ALLURE_METADATA_CONTENT_TYPE) {
        if (!attachment.body) {
          continue;
        }

        const metadata: MetadataMessage = JSON.parse(attachment.body.toString());
        metadata.links?.forEach((val) => allureTest.addLink(val.url, val.name, val.type));
        metadata.labels?.forEach((val) => allureTest.addLabel(val.name, val.value));
        metadata.parameter?.forEach((val) =>
          allureTest.parameter(val.name, val.value, {
            excluded: val.excluded,
            mode: val.mode,
          }),
        );

        if (metadata.description) {
          allureTest.description = metadata.description;
        }
        continue;
      }

      let fileName;
      if (attachment.body) {
        fileName = runtime.writeAttachment(attachment.body, attachment.contentType);
      } else {
        if (!fs.existsSync(attachment.path!)) {
          continue;
        }
        fileName = runtime.writeAttachmentFromPath(attachment.path!, attachment.contentType);
      }

      const diffEndRegexp = /-((expected)|(diff)|(actual))\.png$/;

      if (attachment.name.match(diffEndRegexp)) {
        const pathWithoutEnd = attachment.path!.replace(diffEndRegexp, "");

        if (this.processedDiffs.includes(pathWithoutEnd)) {
          continue;
        }

        const actualBase64 = await readImageAsBase64(`${pathWithoutEnd}-actual.png`),
          expectedBase64 = await readImageAsBase64(`${pathWithoutEnd}-expected.png`),
          diffBase64 = await readImageAsBase64(`${pathWithoutEnd}-diff.png`);

        const diffName = attachment.name.replace(diffEndRegexp, "");

        const res = this.allureRuntime?.writeAttachment(
          JSON.stringify({
            expected: expectedBase64,
            actual: actualBase64,
            diff: diffBase64,
            name: diffName,
          } as ImageDiffAttachment),
          { contentType: ALLURE_IMAGEDIFF_CONTENT_TYPE, fileExtension: "imagediff" },
        );

        allureTest.addAttachment(diffName, { contentType: ALLURE_IMAGEDIFF_CONTENT_TYPE }, res!);

        this.processedDiffs.push(pathWithoutEnd);
      } else {
        allureTest.addAttachment(attachment.name, attachment.contentType, fileName);
      }
    }

    if (result.stdout.length > 0) {
      allureTest.addAttachment(
        "stdout",
        "text/plain",
        runtime.writeAttachment(stripAscii(result.stdout.join("")), "text/plain"),
      );
    }

    if (result.stderr.length > 0) {
      allureTest.addAttachment(
        "stderr",
        "text/plain",
        runtime.writeAttachment(stripAscii(result.stderr.join("")), "text/plain"),
      );
    }

    allureTest.calculateHistoryId();

    allureTest.endTest();
  }

  addSkippedResults() {
    const unprocessedCases = this.suite
      .allTests()
      .filter((testCase) => !this.allureTestCache.has(testCase));

    unprocessedCases.forEach((testCase) => {
      this.onTestBegin(testCase);
      const allureTest = this.allureTestCache.get(testCase);
      if (allureTest) {
        allureTest.addLabel(LabelName.ALLURE_ID, "-1");
        allureTest.detailsMessage =
          "This test was skipped due to test setup error. Check you setup scripts to fix the issue.";
      }

      this.onTestEnd(testCase, {
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
    });
  }

  onEnd(): void {
    this.addSkippedResults();

    for (const group of this.allureGroupCache.values()) {
      group.endGroup();
    }

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

  private getAllureRuntime(): AllureRuntime {
    if (!this.allureRuntime) {
      throw new Error("Unexpected state: `allureRuntime` is not initialized");
    }
    return this.allureRuntime;
  }

  private ensureAllureGroupCreated(suite: Suite): AllureGroup {
    let group = this.allureGroupCache.get(suite);
    if (!group) {
      const parent = suite.parent
        ? this.ensureAllureGroupCreated(suite.parent)
        : this.getAllureRuntime();
      group = parent.startGroup(suite.title);
      this.allureGroupCache.set(suite, group);
    }
    return group;
  }

  private ensureAllureStepCreated(step: TestStep, allureTest: AllureTest): AllureStep {
    let allureStep = this.allureStepCache.get(step);
    if (!allureStep) {
      const parent = step.parent
        ? this.ensureAllureStepCreated(step.parent, allureTest)
        : allureTest;
      allureStep = parent.startStep(step.title);
      this.allureStepCache.set(step, allureStep);
    }
    return allureStep;
  }
}

const statusToAllureStats = (status: TestStatus, expectedStatus: TestStatus): Status => {
  if (status === "skipped") {
    return Status.SKIPPED;
  }
  if (status === "timedOut") {
    return Status.BROKEN;
  }
  if (status === expectedStatus) {
    return Status.PASSED;
  }
  return Status.FAILED;
};

export default AllureReporter;

const appendStep = (parent: ExecutableItemWrapper, step: TestStep) => {
  const allureStep = parent.startStep(step.title, step.startTime.getTime());
  allureStep.endStep(step.startTime.getTime() + step.duration);
  allureStep.status = step.error ? Status.FAILED : Status.PASSED;
  for (const child of step.steps || []) {
    appendStep(allureStep, child);
  }
};

const getStatusDetails = (error: TestError): StatusDetails => {
  const message = error.message && stripAscii(error.message);
  let trace = error.stack && stripAscii(error.stack);
  if (trace && message && trace.startsWith(`Error: ${message}`)) {
    trace = trace.substr(message.length + "Error: ".length);
  }
  return {
    message,
    trace,
  };
};

export * from "./helpers";
