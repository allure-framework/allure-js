import Cypress from "cypress";
import { readFileSync } from "node:fs";
import { AllureRuntime, AllureStep, AllureTest, extractMetadataFromString, getSuitesLabels } from "allure-js-commons";
import { LabelName, Link, MessageType, MessagesQueue, Stage, TestEndMessage, TestStartMessage } from "./model";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
};

const startAllureTest = (runtime: AllureRuntime, { payload }: TestStartMessage) => {
  const suiteLabels = getSuitesLabels(payload.specPath.slice(0, -1));
  const testTitle = payload.specPath[payload.specPath.length - 1];
  const titleMetadata = extractMetadataFromString(testTitle);
  const currentTest = new AllureTest(runtime, payload.start);

  currentTest.name = titleMetadata.cleanTitle;
  currentTest.fullName = `${payload.filename}#${payload.specPath.join(" ")}`;
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
  const runtime = new AllureRuntime({
    resultsDir: config?.resultsDir || "./allure-results",
  });
  const currentSteps: AllureStep[] = [];

  on("task", {
    allureReportTest: (queue: MessagesQueue) => {
      const testStartMessage: TestStartMessage = queue.find(
        (message) => message.type === MessageType.TEST_STARTED,
      ) as TestStartMessage;
      const testEndMessage: TestEndMessage = queue.find(
        (message) => message.type === MessageType.TEST_ENDED,
      ) as TestEndMessage;
      const restMessages = queue.filter(
        (message) => ![MessageType.TEST_STARTED, MessageType.TEST_ENDED].includes(message.type),
      );
      const currentTest = startAllureTest(runtime, testStartMessage);

      restMessages.forEach(({ type, payload }) => {
        if (type === MessageType.STEP_STARTED) {
          const currentStep = currentSteps[currentSteps.length - 1];
          const newStep = (currentStep || currentTest).startStep(payload.name, payload.start);

          currentSteps.push(newStep);
          return;
        }

        if (type === MessageType.STEP_ENDED) {
          const currentStep = currentSteps.pop();

          currentStep.status = payload.status;
          currentStep.statusDetails = payload.statusDetails;
          currentStep.stage = payload.stage;
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
          const { parameter, links, ...metadata } = payload;
          const currentStep = currentSteps[currentSteps.length - 1];

          parameter?.forEach(({ name, value, excluded, mode }) => {
            (currentStep || currentTest).parameter(name, value, {
              excluded,
              mode,
            });
          });

          if (!config?.links?.length || !links?.length) {
            currentTest.applyMetadata(metadata);
            return;
          }

          const formattedLinks: Link[] = links?.map((link) => {
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

      currentTest.stage = testEndMessage.payload.stage;
      currentTest.status = testEndMessage.payload.status;
      currentTest.statusDetails = testEndMessage.payload.statusDetails;

      currentTest.calculateHistoryId();

      currentTest.endTest(testEndMessage.payload.stop);

      return null;
    },
  });
};
