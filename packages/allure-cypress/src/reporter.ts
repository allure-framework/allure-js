import Cypress from "cypress";
import { AllureRuntime, AllureTest } from "allure-js-commons";
import { type AllureCypressExecutableItem } from "./model";

export const allureCypress = (on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) => {
  const runtime = new AllureRuntime({
    resultsDir: "./allure-results",
  });
  let currentTest: AllureTest | undefined;

  on("task", {
    allureStartTest: (testItem: AllureCypressExecutableItem) => {
      currentTest = new AllureTest(runtime, testItem.start);

      currentTest.name = testItem.name;
      currentTest.fullName = testItem.fullName;
      currentTest.stage = testItem.stage;
      currentTest.status = testItem.status;

      return null;
    },
    allureEndTest: (testItem: AllureCypressExecutableItem) => {
      if (!currentTest) {
        return;
      }

      currentTest.stage = testItem.stage;
      currentTest.status = testItem.status;

      if (testItem.statusDetails) {
        currentTest.statusDetails = testItem.statusDetails;
      }

      currentTest.endTest(testItem.stop);
      currentTest = undefined;

      return null;
    },
    // @ts-ignore
    allureLabel: (payload: { name: string; value: string }) => {
      currentTest?.addLabel?.(payload.name, payload.value);

      return null;
    },
  });
};
