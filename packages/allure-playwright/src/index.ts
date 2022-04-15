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
import path from "path";
import { FullConfig, TestStatus } from "@playwright/test";
import { Reporter, Suite, TestStep } from "@playwright/test/reporter";
import {
  AllureGroup,
  AllureRuntime,
  AllureStep,
  ExecutableItemWrapper,
  InMemoryAllureWriter,
  LabelName,
  LinkType,
  Status,
} from "allure-js-commons";

import { ALLURE_METADATA_CONTENT_TYPE, Metadata } from "./helpers";

type AllureReporterOptions = {
  outputFolder?: string;
};

class AllureReporter implements Reporter {
  config!: FullConfig;
  suite!: Suite;
  resultsDir!: string;
  options: AllureReporterOptions;

  constructor(options: AllureReporterOptions = {}) {
    this.options = options;
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.config = config;
    this.suite = suite;
    this.resultsDir = allureReportFolder(this.options.outputFolder);
  }

  onTimeout(): void {
    this.onEnd();
  }

  onEnd(): void {
    const writerForTest = process.env.PW_ALLURE_POST_PROCESSOR_FOR_TEST
      ? new InMemoryAllureWriter()
      : undefined;
    const runtime = new AllureRuntime({ resultsDir: this.resultsDir, writer: writerForTest });
    const processSuite = (suite: Suite, parent: AllureGroup | AllureRuntime): void => {
      const groupName = "Root";
      const group = parent.startGroup(groupName);
      for (const test of suite.tests) {
        for (const result of test.results) {
          const startTime = result.startTime.getTime();
          const endTime = startTime + result.duration;
          const allureTest = group.startTest(test.title, startTime);
          allureTest.addLabel(LabelName.LANGUAGE, "JavaScript");
          allureTest.addLabel(LabelName.FRAMEWORK, "Playwright");
          const [, projectSuiteTitle, fileSuiteTitle, ...suiteTitles] = suite.titlePath();
          if (projectSuiteTitle) {
            allureTest.addLabel(LabelName.PARENT_SUITE, projectSuiteTitle);
          }
          if (fileSuiteTitle) {
            allureTest.addLabel(LabelName.SUITE, fileSuiteTitle);
          }
          if (suiteTitles.length > 0) {
            allureTest.addLabel(LabelName.SUB_SUITE, suiteTitles.join(" > "));
          }

          allureTest.historyId = test.titlePath().slice(1).join(" ");
          allureTest.fullName = test.title;
          allureTest.status = statusToAllureStats(result.status, test.expectedStatus);

          if (result.error) {
            const message = result.error.message && stripAscii(result.error.message);
            let trace = result.error.stack && stripAscii(result.error.stack);
            if (trace && message && trace.startsWith(`Error: ${message}`)) {
              trace = trace.substr(message.length + "Error: ".length);
            }
            allureTest.statusDetails = {
              message,
              trace,
            };
          }

          for (const step of result.steps) {
            appendStep(allureTest, step);
          }

          for (const attachment of result.attachments) {
            if (!attachment.body && !attachment.path) {
              continue;
            }

            if (attachment.contentType === ALLURE_METADATA_CONTENT_TYPE) {
              if (!attachment.body) {
                continue;
              }

              const metadata: Metadata = JSON.parse(attachment.body.toString());
              metadata.links?.forEach((val) => allureTest.addLink(val.url, val.name, val.type));
              metadata.labels?.forEach((val) => allureTest.addLabel(val.name, val.value));
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
            allureTest.addAttachment(attachment.name, attachment.contentType, fileName);
            if (attachment.name === "diff") {
              allureTest.addLabel("testType", "screenshotDiff");
            }
          }

          for (const stdout of result.stdout) {
            allureTest.addAttachment(
              "stdout",
              "text/plain",
              runtime.writeAttachment(stdout, "text/plain"),
            );
          }
          for (const stderr of result.stderr) {
            allureTest.addAttachment(
              "stderr",
              "text/plain",
              runtime.writeAttachment(stderr, "text/plain"),
            );
          }
          allureTest.endTest(endTime);
        }
      }
      for (const child of suite.suites) {
        processSuite(child, group);
      }
      group.endGroup();
    };
    processSuite(this.suite, runtime);

    if (process.env.PW_ALLURE_POST_PROCESSOR_FOR_TEST) {
      try {
        const postProcess = eval(process.env.PW_ALLURE_POST_PROCESSOR_FOR_TEST); // eslint-disable-line no-eval
        console.log(JSON.stringify(postProcess(writerForTest))); // eslint-disable-line no-console
      } catch (e) {
        console.log(JSON.stringify({ error: (e as Error).toString() })); // eslint-disable-line no-console
      }
    }
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

const asciiRegex = new RegExp(
  "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)|(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))", // eslint-disable-line no-control-regex
  "g",
);

const stripAscii = (str: string): string => {
  return str.replace(asciiRegex, "");
};

const appendStep = (parent: ExecutableItemWrapper, step: TestStep) => {
  const allureStep = parent.startStep(step.title, step.startTime.getTime());
  allureStep.endStep(step.startTime.getTime() + step.duration);
  allureStep.status = step.error ? Status.FAILED : Status.PASSED;
  for (const child of step.steps || []) {
    appendStep(allureStep, child);
  }
};

const allureReportFolder = (outputFolder?: string): string => {
  if (process.env.ALLURE_RESULTS_DIR) {
    return path.resolve(process.cwd(), process.env.ALLURE_RESULTS_DIR);
  }
  if (outputFolder) {
    return outputFolder;
  }
  return defaultReportFolder();
};

const defaultReportFolder = (): string => {
  return path.resolve(process.cwd(), "allure-results");
};

export * from "./helpers";
