import Cypress from "cypress";
import { readFileSync } from "node:fs";
import {
  AllureStep,
  AllureTest,
  ContentType,
  LabelName,
  Link,
  Stage,
  extractMetadataFromString,
  getSuitesLabels,
} from "allure-js-commons/new";
import { AllureNodeRuntime, FileSystemAllureWriter } from "allure-js-commons/new/node";
import { MessageType, ReportFinalMessage, TestStartMessage } from "./model";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
};

export class AllureCypress {
  runtime: AllureNodeRuntime;
  currentTestsByAbsolutePath = new Map<string, [AllureTest, number][]>();
  // need to keep the variable here because we recieve end-message and finish the current test separately
  currentSteps: AllureStep[] = [];

  constructor(private config?: AllureCypressConfig) {
    this.runtime = new AllureNodeRuntime({
      writer: new FileSystemAllureWriter({
        resultsDir: config?.resultsDir || "./allure-results",
      }),
    });
  }

  private startAllureTest(message: TestStartMessage) {
    const suiteLabels = getSuitesLabels(message.specPath.slice(0, -1));
    const testTitle = message.specPath[message.specPath.length - 1];
    const titleMetadata = extractMetadataFromString(testTitle);
    const currentTest = new AllureTest(this.runtime, message.start);

    currentTest.name = titleMetadata.cleanTitle;
    currentTest.fullName = `${message.filename}#${message.specPath.join(" ")}`;
    currentTest.stage = Stage.RUNNING;

    currentTest.addLabel(LabelName.LANGUAGE, "javascript");
    currentTest.addLabel(LabelName.FRAMEWORK, "cypress");

    suiteLabels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    titleMetadata.labels.forEach((label) => {
      currentTest.addLabel(label.name, label.value);
    });

    return currentTest;
  }

  endSpec(spec: Cypress.Spec, results: CypressCommandLine.RunResult) {
    const currentTests = this.currentTestsByAbsolutePath.get(spec.absolute);

    if (!currentTests?.length) {
      return;
    }

    const videoName = results.video ? this.runtime.writeAttachmentFromPath(results.video, ContentType.MP4) : undefined;

    currentTests.forEach(([test, stop]) => {
      if (videoName) {
        test.addAttachment("Video", ContentType.MP4, videoName);
      }

      test.endTest(stop);
    });
  }

  attachToCypress(on: Cypress.PluginEvents, config?: Cypress.Config) {
    on("task", {
      allureReportTest: ({ testFileAbsolutePath, startMessage, endMessage, messages }: ReportFinalMessage) => {
        const currentTests = this.currentTestsByAbsolutePath.get(testFileAbsolutePath) || [];
        const currentTest = this.startAllureTest(startMessage);

        messages.forEach(({ type, payload }) => {
          if (!currentTest) {
            return;
          }

          if (type === MessageType.STEP_STARTED) {
            const currentStep = this.currentSteps[this.currentSteps.length - 1];
            const newStep = (currentStep || currentTest).startStep(payload.name, payload.start);

            this.currentSteps.push(newStep);
            return;
          }

          if (type === MessageType.STEP_ENDED) {
            const currentStep = this.currentSteps.pop()!;

            currentStep.status = payload.status;
            currentStep.statusDetails = payload.statusDetails!;
            currentStep.stage = payload.stage!;
            currentStep.endStep(payload.stop);
            return;
          }

          if (type === MessageType.SCREENSHOT) {
            const currentStep = this.currentSteps[this.currentSteps.length - 1];
            const attachmentName = payload.name;
            const screenshotBody = readFileSync(payload.path);
            const screenshotName = this.runtime.writeAttachment(screenshotBody, ContentType.PNG);

            (currentStep || currentTest).addAttachment(attachmentName, ContentType.PNG, screenshotName);
            return;
          }

          if (type === MessageType.METADATA) {
            const { parameter = [], links = [], attachments, ...metadata } = payload;
            const currentStep = this.currentSteps[this.currentSteps.length - 1];

            parameter.forEach(({ name, value, excluded, mode }) => {
              (currentStep || currentTest).parameter(name, value, {
                excluded,
                mode,
              });
            });
            attachments?.forEach((attachment) => {
              const attachmentName = this.runtime.writeAttachment(
                attachment.content,
                attachment.type,
                attachment.encoding,
              );

              (currentStep || currentTest).addAttachment(attachment.name, attachment.type, attachmentName);
            });

            if (!this.config?.links?.length) {
              currentTest.applyMetadata({
                ...metadata,
                links,
              });
              return;
            }

            const formattedLinks: Link[] = links.map((link) => {
              const matcher = this.config?.links?.find?.((item) => item.type === link.type);

              if (!matcher || link.url.startsWith("http")) {
                return link;
              }

              const url = matcher.urlTemplate.replace("%s", link.url);
              const name = link.name || link.url;

              return {
                ...link,
                name,
                url,
              };
            });

            currentTest.applyMetadata({
              ...metadata,
              links: formattedLinks,
            });
            return;
          }
        });

        currentTest.stage = endMessage.stage;
        currentTest.status = endMessage.status;
        currentTest.statusDetails = endMessage.statusDetails!;
        currentTest.calculateHistoryId();
        this.currentTestsByAbsolutePath.set(
          testFileAbsolutePath,
          currentTests.concat([[currentTest, endMessage.stop]]),
        );

        return null;
      },
    });
  }
}

export const allureCypress = (
  on: Cypress.PluginEvents,
  cypressConfig: Cypress.Config,
  allureConfig?: AllureCypressConfig,
) => {
  const allureCypressReporter = new AllureCypress(allureConfig);

  allureCypressReporter.attachToCypress(on, cypressConfig);

  on("after:spec", (spec, result) => {
    allureCypressReporter.endSpec(spec, result);
  });

  return allureCypressReporter;
};
