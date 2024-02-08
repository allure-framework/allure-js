import Cypress from "cypress";
import { AllureRuntime, AllureTest, LabelName, MetadataMessage, Stage, getSuitesLabels } from "allure-js-commons";
import { type StartTestMessage, type EndTestMessage } from "./model";

export const allureCypress = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  const runtime = new AllureRuntime({
    resultsDir: "./allure-results",
  });
  let currentTest: AllureTest | undefined;

  on("task", {
    allureStartTest: (message: StartTestMessage) => {
      const suiteLabels = getSuitesLabels(message.specPath);

      currentTest = new AllureTest(runtime, message.start);

      currentTest.name = message.specPath[message.specPath.length - 1];
      currentTest.fullName = `${message.filename}#${message.specPath.join(" ")}`;
      currentTest.stage = Stage.RUNNING;

      currentTest.addLabel(LabelName.LANGUAGE, "javascript");
      currentTest.addLabel(LabelName.FRAMEWORK, "cypress");

      suiteLabels.forEach((label) => {
        currentTest!.addLabel(label.name, label.value);
      });

      return null;
    },
    allureEndTest: (message: EndTestMessage) => {
      if (!currentTest) {
        return null;
      }

      currentTest.stage = message.stage;
      currentTest.status = message.status;

      if (message.statusDetails) {
        currentTest.statusDetails = message.statusDetails;
      }

      currentTest.endTest(message.stop);
      currentTest = undefined;

      return null;
    },
    allureMetadata: (message: MetadataMessage) => {
      if (!currentTest) {
        return null;
      }

      currentTest.applyMetadata(message);

      return null;
    },
  });
};
