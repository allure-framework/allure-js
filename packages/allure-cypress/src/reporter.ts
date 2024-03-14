import Cypress from "cypress";
import { readFileSync } from "node:fs";
import {
  AllureStep,
  AllureTest,
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

const startAllureTest = (runtime: AllureNodeRuntime, message: TestStartMessage) => {
  const suiteLabels = getSuitesLabels(message.specPath.slice(0, -1));
  const testTitle = message.specPath[message.specPath.length - 1];
  const titleMetadata = extractMetadataFromString(testTitle);
  const currentTest = new AllureTest(runtime, message.start);

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
};

export const allureCypress = (on: Cypress.PluginEvents, config?: AllureCypressConfig) => {
  const runtime = new AllureNodeRuntime({
    writer: new FileSystemAllureWriter({
      resultsDir: config?.resultsDir || "./allure-results",
    }),
  });
  const currentSteps: AllureStep[] = [];

  on("task", {
    allureReportTest: ({ startMessage, endMessage, messages }: ReportFinalMessage) => {
      const currentTest = startAllureTest(runtime, startMessage);

      messages.forEach(({ type, payload }) => {
        if (type === MessageType.STEP_STARTED) {
          const currentStep = currentSteps[currentSteps.length - 1];
          const newStep = (currentStep || currentTest).startStep(payload.name, payload.start);

          currentSteps.push(newStep);
          return;
        }

        if (type === MessageType.STEP_ENDED) {
          const currentStep = currentSteps.pop()!;

          currentStep.status = payload.status;
          currentStep.statusDetails = payload.statusDetails!;
          currentStep.stage = payload.stage!;
          currentStep.endStep(payload.stop);
          return;
        }

        if (type === MessageType.SCREENSHOT) {
          const currentStep = currentSteps[currentSteps.length - 1];
          const attachmentName = payload.name;
          const screenshotBody = readFileSync(payload.path);
          const screenshotName = runtime.writeAttachment(screenshotBody, "image/png");

          (currentStep || currentTest).addAttachment(attachmentName, "image/png", screenshotName);
          return;
        }

        if (type === MessageType.METADATA) {
          const { parameter = [], links = [], attachments, ...metadata } = payload;
          const currentStep = currentSteps[currentSteps.length - 1];

          parameter.forEach(({ name, value, excluded, mode }) => {
            currentTest.parameter(name, value, {
              excluded,
              mode,
            });
          });
          attachments?.forEach((attachment) => {
            const attachmentName = runtime.writeAttachment(attachment.content, attachment.type, attachment.encoding);

            (currentStep || currentTest).addAttachment(attachment.name, attachment.type, attachmentName);
          });

          if (!config?.links?.length) {
            currentTest.applyMetadata({
              ...metadata,
              links,
            });
            return;
          }

          const formattedLinks: Link[] = links.map((link) => {
            const matcher = config?.links?.find?.((item) => item.type === link.type);

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
      currentTest.endTest(endMessage.stop);

      return null;
    },
  });
};
