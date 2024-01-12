import { LabelName, LinkType, MetadataMessage, Stage, StepMetadata } from "allure-js-commons";
import { test } from "vitest";
import { AllureApi, AllureMeta, AllureStep } from "./model.js";

export const allureTest = test.extend<{ allure: AllureApi }>({
  allure: async ({ task }, use) => {
    const taskMeta = task.meta as {
      allureMetadataMessage: MetadataMessage;
      currentStep: StepMetadata;
    };

    // taskMeta.allureMetadataMessage = { currentStep: currentTest, currentTest: currentTest };
    taskMeta.allureMetadataMessage = {
      displayName: task.name || "root-test",
      labels: [],
      links: [],
    };
    taskMeta.currentStep = undefined;

    await use({
      label: (name, value) => {
        taskMeta.allureMetadataMessage.labels.push({ name, value });
      },
      epic: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.EPIC, value });
      },
      feature: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.FEATURE, value });
      },
      story: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.STORY, value });
      },
      suite: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.SUITE, value });
      },
      parentSuite: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.PARENT_SUITE, value });
      },
      subSuite: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.SUB_SUITE, value });
      },
      owner: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.OWNER, value });
      },
      severity: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.SEVERITY, value });
      },
      layer: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.LAYER, value });
      },
      id: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.ALLURE_ID, value });
      },
      tag: (value) => {
        taskMeta.allureMetadataMessage.labels.push({ name: LabelName.TAG, value });
      },
      link: (url: string, name?: string, type?: string) => {
        taskMeta.allureMetadataMessage.links.push({ name, url, type });
      },
      issue: (name: string, url: string) => {
        taskMeta.allureMetadataMessage.links.push({ name, url, type: LinkType.ISSUE });
      },
      tms: (name: string, url: string) => {
        taskMeta.allureMetadataMessage.links.push({ name, url, type: LinkType.TMS });
      },
      // parameter: (name: string, value: string, options?: ParameterOptions) => {
      //   taskMeta.allureMetadataMessage.currentTest.parameter.push({ name, value, ...options });
      // },
      // step: async (name, body) => {
      //   // const prevStep = taskMeta.currentStep || taskMeta.allureMetadataMessage.steps[taskMeta.allureMetadataMessage.steps.length - 1];
      //   // TODO: change stage and status
      //   // const nextStep: Partial<StepMetadata> = {
      //   //   name,
      //   //   steps: [],
      //   // };
      //   // if (!prevStep) {
      //   //   taskMeta.allureMetadataMessage.steps.push(nextStep as StepMetadata);
      //   // } else {
      //   //   prevStep.steps.push(nextStep as StepMetadata);
      //   // }
      //   // // taskMeta.allureMetadataMessage.currentStep = nextStep;
      //   // try {
      //   //   const result = await body();
      //   //   nextStep.status = Status.PASSED;
      //   //   return result;
      //   // } catch (error) {
      //   //   nextStep.status = Status.FAILED;
      //   //   if (error instanceof Error) {
      //   //     nextStep.statusDetails = { message: error.message, trace: error.stack };
      //   //   }
      //   //   throw error;
      //   // } finally {
      //   //   nextStep.stop = Date.now();
      //   //   taskMeta.allureMetadataMessage.currentStep = prevStep;
      //   // }
      // },
    });

    // await use({
    //   attachment: (name, content, options) => {
    //     const parsedOptions = typeof options === "string" ? { contentType: options } : options;

    //     taskMeta.allureMetadataMessage.currentStep.attachments.push({
    //       name,
    //       content,
    //       ...parsedOptions,
    //     });
    //   },
    //   label: (name, value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name, value }),
    //   epic: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.EPIC, value }),
    //   feature: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.FEATURE, value }),
    //   story: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.STORY, value }),
    //   suite: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.SUITE, value }),
    //   parentSuite: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({
    //       name: LabelName.PARENT_SUITE,
    //       value,
    //     }),
    //   subSuite: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({
    //       name: LabelName.SUB_SUITE,
    //       value,
    //     }),
    //   owner: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.OWNER, value }),
    //   severity: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.SEVERITY, value }),
    //   layer: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.LAYER, value }),
    //   id: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({
    //       name: LabelName.ALLURE_ID,
    //       value,
    //     }),
    //   tag: (value) =>
    //     taskMeta.allureMetadataMessage.currentTest.labels.push({ name: LabelName.TAG, value }),
    //   parameter: (name: string, value: string, options?: ParameterOptions) => {
    //     taskMeta.allureMetadataMessage.currentTest.parameter.push({ name, value, ...options });
    //   },
    //   displayName: (name: string) => {
    //     taskMeta.allureMetadataMessage.currentTest.name = name;
    //   },
    //   testCaseId: (id: string) => {
    //     taskMeta.allureMetadataMessage.currentTest.testCaseId = id;
    //   },
    //   historyId: (id: string) => {
    //     taskMeta.allureMetadataMessage.currentTest.historyId = id;
    //   },
    //   description: (markdown: string) => {
    //     taskMeta.allureMetadataMessage.currentTest.description = markdown;
    //   },
    //   descriptionHtml: (html: string) => {
    //     taskMeta.allureMetadataMessage.currentTest.descriptionHtml = html;
    //   }
    // });
  },
});
