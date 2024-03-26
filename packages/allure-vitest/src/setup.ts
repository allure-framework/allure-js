import * as console from "node:console";
import { type TaskContext, afterEach, beforeEach } from "vitest";
import { LabelName, LinkType, ParameterOptions } from "allure-js-commons";
import { Attachment, Stage, Status, StatusDetails } from "allure-js-commons/new";
import {
  StepResult,
  TestHolder,
  TestResult,
  TestRuntime,
  createStepResult,
  createTestResult,
} from "allure-js-commons/new/sdk";
import { AllureNodeCrypto } from "allure-js-commons/new/sdk/node";

// import { label, link } from "./index.js";

declare global {
  // eslint-disable-next-line no-var
  var allure: {
    label: (name: string, value: string) => Promise<void>;
    link: (type: string, url: string, name?: string) => Promise<void>;
    parameter: (name: string, value: string, options?: ParameterOptions) => Promise<void>;
    description: (markdown: string) => Promise<void>;
    descriptionHtml: (html: string) => Promise<void>;
    testCaseId: (id: string) => Promise<void>;
    historyId: (id: string) => Promise<void>;
    allureId: (id: string) => Promise<void>;
    displayName: (name: string) => Promise<void>;
    attachment: (name: string, content: Buffer | string, type: string) => Promise<void>;
    issue: (name: string, url: string) => Promise<void>;
    tms: (name: string, url: string) => Promise<void>;
    epic: (name: string) => Promise<void>;
    feature: (name: string) => Promise<void>;
    story: (name: string) => Promise<void>;
    suite: (name: string) => Promise<void>;
    parentSuite: (name: string) => Promise<void>;
    subSuite: (name: string) => Promise<void>;
    owner: (name: string) => Promise<void>;
    severity: (name: string) => Promise<void>;
    layer: (name: string) => Promise<void>;
    tag: (name: string) => Promise<void>;
    step: (name: string, body: () => Promise<void>) => Promise<void>;
  };

  // eslint-disable-next-line no-var
  var allureTestRuntime: AllureVitestTestRuntime;
}

export class AllureVitestTestRuntime implements TestRuntime {
  currentTestHolder = new TestHolder<TestResult, StepResult>();

  crypto = new AllureNodeCrypto();

  constructor(context: TaskContext) {
    const testResult = createTestResult(this.crypto.uuid());

    testResult.name = context.task.name;

    this.currentTestHolder.currentTest = testResult;
  }

  // TODO:
  addAttachment() {
    // (this.currentTestHolder.currentStep || this.currentTestHolder.currentTest).attachments.push(payload);
  }

  startStep(name: string) {
    this.currentTestHolder.currentSteps.push({
      ...createStepResult(),
      name,
    });
  }

  endStep(status: Status, details?: StatusDetails, stage?: Stage, stop?: number) {
    const currentStep = this.currentTestHolder.currentSteps.pop();

    currentStep.status = status;
    currentStep.statusDetails = details;
    currentStep.stage = stage || Stage.FINISHED;
    currentStep.stop = stop || Date.now();

    // there is no steps
    if (!this.currentTestHolder.currentStep) {
      this.currentTestHolder.currentTest.steps.push(currentStep);
      return;
    }

    this.currentTestHolder.currentStep.steps.push(currentStep);
  }

  sendMessageSync(message: Partial<TestResult>) {
    const { labels, links, parameters, attachments, steps } = message;

    if (labels) {
      this.currentTestHolder.currentTest.labels.push(...labels);
    }

    if (links) {
      this.currentTestHolder.currentTest.links.push(...links);
    }

    if (parameters) {
      this.currentTestHolder.currentTest.parameters.push(...parameters);
    }

    if (attachments) {
      this.currentTestHolder.currentTest.attachments.push(...attachments);
    }

    // TODO: we need data structure to transfer test result compatible data between runtimes
    // console.log("sendMessageSync", message, this.currentTestHolder.currentTest);
  }
}

export const label = async (name: string, value: string) => {
  global.allureTestRuntime.sendMessageSync({
    labels: [{ name, value }],
  });
};

export const link = async (type: string, url: string, name?: string) => {
  global.allureTestRuntime.sendMessageSync({
    links: [{ type, url, name }],
  });
};

export const epic = async (value: string) => {
  await label(LabelName.EPIC, value);
};

export const feature = async (value: string) => {
  await label(LabelName.FEATURE, value);
};

export const story = async (value: string) => {
  await label(LabelName.STORY, value);
};

export const suite = async (value: string) => {
  await label(LabelName.SUITE, value);
};

export const parentSuite = async (value: string) => {
  await label(LabelName.PARENT_SUITE, value);
};

export const subSuite = async (value: string) => {
  await label(LabelName.SUB_SUITE, value);
};

export const owner = async (value: string) => {
  await label(LabelName.OWNER, value);
};

export const severity = async (value: string) => {
  await label(LabelName.SEVERITY, value);
};

export const layer = async (value: string) => {
  await label(LabelName.LAYER, value);
};

export const tag = async (value: string) => {
  await label(LabelName.TAG, value);
};

export const allureId = async (value: string) => {
  await label(LabelName.ALLURE_ID, value);
};

export const issue = async (name: string, url: string) => {
  await link(LinkType.ISSUE, url, name);
};

export const tms = async (name: string, url: string) => {
  await link(LinkType.TMS, url, name);
};

export const parameter = async (name: string, value: string, options?: ParameterOptions) => {
  global.allureTestRuntime.sendMessageSync({
    parameters: [{ name, value, ...options }],
  });
};

export const description = async (markdown: string) => {
  global.allureTestRuntime.sendMessageSync({
    description: markdown,
  });
};

export const descriptionHtml = async (html: string) => {
  global.allureTestRuntime.sendMessageSync({
    descriptionHtml: html,
  });
};

export const displayName = async (name: string) => {
  global.allureTestRuntime.sendMessageSync({
    name,
  });
};

export const historyId = async (value: string) => {
  global.allureTestRuntime.sendMessageSync({
    historyId: value,
  });
};

export const testCaseId = async (value: string) => {
  global.allureTestRuntime.sendMessageSync({
    testCaseId: value,
  });
};

export const attachment = async (name: string, content: Buffer | string, type: string) => {
  // TODO:
  console.log("attachment: ", { name, content });
  // injectAllureMeta(context);
  //
  // const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  // const isBuffer = Buffer.isBuffer(content);

  // global.allureTestRuntime.addAttachment({
  //     name: name || "Attachment",
  //     content: isBuffer ? content.toString("base64") : content,
  //     encoding: isBuffer ? "base64" : "utf8",
  //     type,
  // })
  //
  // (currentStep || currentTest).attachments.push({
  //   name: name || "Attachment",
  //   content: isBuffer ? content.toString("base64") : content,
  //   encoding: isBuffer ? "base64" : "utf8",
  //   type,
  // });
};

export const step = async (name: string, body: () => Promise<void>) => {
  global.allureTestRuntime.startStep(name);

  try {
    await body();

    global.allureTestRuntime.endStep(Status.PASSED);
  } catch (err) {
    global.allureTestRuntime.endStep(Status.FAILED, { message: err.message, trace: err.stack });

    throw err;
  }

  // TODO:
  // console.log("step: ", { name });
  // injectAllureMeta(context);
  //
  // const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  // const prevStep = currentStep;
  // const nextStep: Partial<StepMetadata> = {
  //   name,
  //   steps: [],
  //   attachments: [],
  // };
  //
  // (currentStep || currentTest).steps.push(nextStep as StepMetadata);
  // (context.task.meta as AllureTestMeta).currentStep = nextStep as StepMetadata;
  //
  // try {
  //   await body();
  //
  //   nextStep.status = Status.PASSED;
  // } catch (error) {
  //   nextStep.status = Status.FAILED;
  //
  //   if (error instanceof Error) {
  //     nextStep.statusDetails = { message: error.message, trace: error.stack };
  //   }
  //   throw error;
  // } finally {
  //   nextStep.stop = Date.now();
  //   nextStep.stage = Stage.FINISHED;
  //
  //   (context.task.meta as AllureTestMeta).currentStep = prevStep;
  // }
};

// const existsInTestPlan = (ctx: TaskContext, testPlan?: TestPlanV1) => {
//   if (!testPlan) {
//     return true;
//   }
//
//   const { name: testName } = ctx.task;
//   const testFullName = getTestFullName(ctx.task, cwd());
//   const { labels } = extractMetadataFromString(testName);
//   const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);
//
//   return testPlan.tests.some(({ id, selector = "" }) => {
//     const idMatched = id ? String(id) === allureIdLabel?.value : false;
//     const selectorMatched = selector === testFullName;
//
//     return idMatched || selectorMatched;
//   });
// };

// TODO:
// beforeAll(() => {
//   global.allureTestPlan = parseTestPlan();
// });
//
// afterAll(() => {
//   global.allureTestPlan = undefined;
// });

beforeEach(async (ctx) => {
  // const allureAPI = bindAllureApi(ctx.task);
  // TODO: testplan
  // if (!existsInTestPlan(ctx, global.allureTestPlan as TestPlanV1)) {
  //   await allureAPI.label(ALLURE_SKIPPED_BY_TEST_PLAN_LABEL as string, "true");
  //   ctx.skip();
  //   return;
  // }
  //
  // (ctx.task as any).meta = {
  //   ...ctx.task.meta,
  //   VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  // };
  //
  // // @ts-ignore
  // global.allure = allureAPI;

  global.allure = {
    label,
    link,
    parameter,
    epic,
    feature,
    story,
    suite,
    subSuite,
    parentSuite,
    owner,
    layer,
    displayName,
    testCaseId,
    historyId,
    allureId,
    description,
    descriptionHtml,
    issue,
    tms,
    severity,
    tag,
    attachment,
    step,
  };
  global.allureTestRuntime = new AllureVitestTestRuntime(ctx);
});

afterEach((ctx) => {
  // @ts-ignore
  ctx.task.meta.allureTestResult = global.allureTestRuntime.currentTestHolder.currentTest;

  global.allureTestRuntime = undefined;
});
