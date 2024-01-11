import { Status } from "allure-js-commons";
import { test } from "vitest";
import { AllureApi, AllureMeta, AllureStep } from "./model.js";

export const allureTest = test.extend<{ allure: AllureApi }>({
  allure: async ({ task }, use) => {
    const meta = task.meta as { allure: AllureMeta };
    const currentTest = { name: "root-test", labels: [], attachments: [], steps: [] };
    meta.allure = { currentStep: currentTest, currentTest: currentTest };
    await use({
      attachment: (name, content, options) => {
        const parsedOptions = typeof options === "string" ? { contentType: options } : options;
        meta.allure.currentStep.attachments.push({ name, content, ...parsedOptions });
      },
      label: (name, value) => meta.allure.currentTest.labels.push({ name, value }),
      step: async (name, body) => {
        const prevStep = meta.allure.currentStep;
        const nextStep: AllureStep = { name, attachments: [], steps: [], start: Date.now() };
        prevStep.steps.push(nextStep);
        meta.allure.currentStep = nextStep;
        try {
          const result = await body();
          nextStep.status = Status.PASSED;
          return result;
        } catch (error) {
          nextStep.status = Status.FAILED;
          if (error instanceof Error) {
            nextStep.statusDetails = { message: error.message, trace: error.stack };
          }
          throw error;
        } finally {
          nextStep.stop = Date.now();
          meta.allure.currentStep = prevStep;
        }
      },
    });
  },
});
