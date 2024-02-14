import Cypress from "cypress";
import { readFileSync } from "node:fs";
import {
  AllureRuntime,
  AllureStep,
  AllureTest,
  LabelName,
  MetadataMessage,
  Stage,
  extractMetadataFromString,
  getSuitesLabels,
} from "allure-js-commons";
import { EndStepMessage, type EndTestMessage, Link, StartStepMessage, type StartTestMessage } from "./model";

export type AllureCypressConfig = {
  resultsDir?: string;
  links?: {
    type: string;
    urlTemplate: string;
  }[];
};

export const allureCypress = (on: Cypress.PluginEvents, config?: AllureCypressConfig) => {
  const runtime = new AllureRuntime({
    resultsDir: config?.resultsDir || "./allure-results",
  });
  let currentTest: AllureTest | undefined;
  const currentSteps: AllureStep[] = [];

  on("task", {
    allureStartTest: (message: StartTestMessage) => {
      const suiteLabels = getSuitesLabels(message.specPath);
      const testTitle = message.specPath[message.specPath.length - 1];
      const titleMetadata = extractMetadataFromString(testTitle);

      currentTest = new AllureTest(runtime, message.start);

      currentTest.name = titleMetadata.cleanTitle;
      currentTest.fullName = `${message.filename}#${message.specPath.join(" ")}`;
      currentTest.stage = Stage.RUNNING;

      currentTest.addLabel(LabelName.LANGUAGE, "javascript");
      currentTest.addLabel(LabelName.FRAMEWORK, "cypress");

      suiteLabels.forEach((label) => {
        currentTest!.addLabel(label.name, label.value);
      });

      titleMetadata.labels.forEach((label) => {
        currentTest!.addLabel(label.name, label.value);
      });

      return null;
    },
    allureEndTest: (message: EndTestMessage) => {
      if (!currentTest) {
        return null;
      }

      // finish unfinished steps (for example when assertion failed)
      if (currentSteps.length > 0) {
        [...currentSteps].reverse().forEach((step, i) => {
          const actualStepIdx = currentSteps.length - 1 - i;

          step.status = message.status;
          step.stage = message.stage;

          // status details should be set for the last step to display error correctly
          if (i === 0) {
            step.statusDetails = message.statusDetails!;
          }

          step.endStep();

          // remove actual step
          currentSteps.splice(actualStepIdx, 1);
        });
      } else {
        currentTest.statusDetails = message.statusDetails!;
      }

      currentTest.stage = message.stage;
      currentTest.status = message.status;
      currentTest.endTest(message.stop);
      currentTest = undefined;

      return null;
    },
    allureStartStep: (message: StartStepMessage) => {
      if (!currentTest) {
        return null;
      }

      const currentStep = currentSteps[currentSteps.length - 1];
      const step = (currentStep || currentTest).startStep(message.name);

      currentSteps.push(step);

      return null;
    },
    allureEndStep: (message: EndStepMessage) => {
      const currentStep = currentSteps.pop();

      if (!currentStep) {
        return null;
      }

      currentStep.status = message.status || Stage.PENDING;
      currentStep.stage = message.stage || Stage.FINISHED;

      if (message.statusDetails) {
        currentStep.statusDetails = message.statusDetails;
      }

      currentStep.endStep();

      return null;
    },
    allureMetadata: (message: MetadataMessage) => {
      if (!currentTest) {
        return null;
      }

      if (!config?.links?.length || !message?.links?.length) {
        currentTest.applyMetadata(message);

        return null;
      }

      const { links, ...rest } = message;
      const formattedLinks: Link[] = links?.map((link) => {
        const matcher = config?.links?.find?.(({ type }) => type === link.type);

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
        ...rest,
        links: formattedLinks,
      });

      return null;
    },
  });
  on("after:screenshot", (details) => {
    const currentStep = currentSteps[currentSteps.length - 1];

    if (!currentTest && !currentStep) {
      return;
    }

    const attachmentName = details.name || "Screenshot";
    const screenshotBody = readFileSync(details.path);
    const screenshotName = runtime.writeAttachment(screenshotBody, "image/png");

    (currentStep || currentTest).addAttachment(attachmentName, "image/png", screenshotName);
  });
};
