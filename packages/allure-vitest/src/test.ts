import {
  LabelName,
  LinkType,
  ParameterOptions,
  MetadataMessage,
  Status,
  Stage,
  StepMetadata,
} from "allure-js-commons";
import { test } from "vitest";
import { AllureApi, AllureMeta, AllureStep } from "./model.js";

export const allureTest = test.extend<{ allure: AllureApi }>({
  allure: async ({ task }, use) => {
    const taskMeta = task.meta as {
      currentTest: MetadataMessage;
      currentStep?: StepMetadata;
    };

    taskMeta.currentTest = {
      displayName: task.name || "root-test",
      labels: [],
      links: [],
      parameter: [],
      steps: [],
      attachments: [],
    };
    taskMeta.currentStep = undefined;

    await use({
      label: (name, value) => {
        taskMeta.currentTest.labels!.push({ name, value });
      },
      epic: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.EPIC, value });
      },
      feature: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.FEATURE, value });
      },
      story: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.STORY, value });
      },
      suite: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.SUITE, value });
      },
      parentSuite: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.PARENT_SUITE, value });
      },
      subSuite: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.SUB_SUITE, value });
      },
      owner: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.OWNER, value });
      },
      severity: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.SEVERITY, value });
      },
      layer: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.LAYER, value });
      },
      id: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.ALLURE_ID, value });
      },
      tag: (value) => {
        taskMeta.currentTest.labels!.push({ name: LabelName.TAG, value });
      },
      link: (url: string, name?: string, type?: string) => {
        taskMeta.currentTest.links!.push({ name, url, type });
      },
      issue: (name: string, url: string) => {
        taskMeta.currentTest.links!.push({ name, url, type: LinkType.ISSUE });
      },
      tms: (name: string, url: string) => {
        taskMeta.currentTest.links!.push({ name, url, type: LinkType.TMS });
      },
      parameter: (name: string, value: string, options?: ParameterOptions) => {
        taskMeta.currentTest.parameter!.push({ name, value, ...options });
      },
      description: (markdown: string) => {
        taskMeta.currentTest.description = markdown;
      },
      descriptionHtml: (html: string) => {
        taskMeta.currentTest.descriptionHtml = html;
      },
      displayName: (name: string) => {
        taskMeta.currentTest.displayName = name;
      },
      historyId: (id: string) => {
        taskMeta.currentTest.historyId = id;
      },
      testCaseId: (id: string) => {
        taskMeta.currentTest.testCaseId = id;
      },
      attachment: (name: string, content: Buffer | string, type: string) => {
        const isBuffer = Buffer.isBuffer(content);

        (taskMeta.currentStep || taskMeta.currentTest).attachments!.push({
          name: name || "Attachment",
          content: isBuffer ? content.toString("base64") : content,
          encoding: isBuffer ? "base64" : "utf8",
          type,
        });
      },
      step: async (name, body) => {
        const prevStep = taskMeta.currentStep;
        const nextStep: Partial<StepMetadata> = {
          name,
          steps: [],
          attachments: [],
        };

        (taskMeta.currentStep || taskMeta.currentTest).steps!.push(nextStep as StepMetadata);
        taskMeta.currentStep = nextStep as StepMetadata;

        try {
          await body();

          nextStep.status = Status.PASSED;
        } catch (error) {
          nextStep.status = Status.FAILED;

          if (error instanceof Error) {
            nextStep.statusDetails = { message: error.message, trace: error.stack };
          }
          throw error;
        } finally {
          nextStep.stop = Date.now();
          nextStep.stage = Stage.FINISHED;

          console.log({
            nextStep,
            prevStep,
          });

          taskMeta.currentStep = prevStep;
        }
      },
    });
  },
});
