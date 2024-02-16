/* eslint @typescript-eslint/require-await: 0 */
import * as vitest from "vitest";
import { LabelName, LinkType, MetadataMessage, ParameterOptions, Stage, Status, StepMetadata } from "allure-js-commons";

export interface AllureVitestApi {
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
}

interface AllureTestMeta extends vitest.TaskMeta {
  currentTest: MetadataMessage;
  currentStep?: StepMetadata;
  VITEST_POOL_ID?: string;
}

declare global {
  export const allure: AllureVitestApi;
}

/**
 * Injects Allure metadata object into the task context to prevent possible
 * runtime errors when the metadata is not available
 */
const injectAllureMeta = (context: vitest.TaskContext) => {
  if ((context?.task?.meta as AllureTestMeta)?.currentTest) {
    return;
  }

  (context.task.meta as AllureTestMeta) = {
    ...context.task.meta,
    currentTest: {
      displayName: context.task.name || "root-test",
      labels: [],
      links: [],
      parameter: [],
      steps: [],
      attachments: [],
    },
  };
};

export const label = async (context: vitest.TaskContext, name: string, value: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.labels.push({ name, value });
};

export const link = async (context: vitest.TaskContext, type: string, url: string, name?: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.links.push({ type, url, name });
};

export const epic = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.EPIC, value);
};

export const feature = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.FEATURE, value);
};

export const story = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.STORY, value);
};

export const suite = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.SUITE, value);
};

export const parentSuite = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.PARENT_SUITE, value);
};

export const subSuite = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.SUB_SUITE, value);
};

export const owner = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.OWNER, value);
};

export const severity = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.SEVERITY, value);
};

export const layer = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.LAYER, value);
};

export const tag = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.TAG, value);
};

export const allureId = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  label(context, LabelName.ALLURE_ID, value);
};

export const issue = async (context: vitest.TaskContext, name: string, url: string) => {
  injectAllureMeta(context);
  link(context, LinkType.ISSUE, url, name);
};

export const tms = async (context: vitest.TaskContext, name: string, url: string) => {
  injectAllureMeta(context);
  link(context, LinkType.TMS, url, name);
};

export const parameter = async (
  context: vitest.TaskContext,
  name: string,
  value: string,
  options?: ParameterOptions,
) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.parameter.push({
    name,
    value,
    ...options,
  });
};

export const description = async (context: vitest.TaskContext, markdown: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.description = markdown;
};

export const descriptionHtml = async (context: vitest.TaskContext, html: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.descriptionHtml = html;
};

export const displayName = async (context: vitest.TaskContext, name: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.displayName = name;
};

export const historyId = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.historyId = value;
};

export const testCaseId = async (context: vitest.TaskContext, value: string) => {
  injectAllureMeta(context);
  (context.task.meta as AllureTestMeta).currentTest.testCaseId = value;
};

export const attachment = async (context: vitest.TaskContext, name: string, content: Buffer | string, type: string) => {
  injectAllureMeta(context);

  const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  const isBuffer = Buffer.isBuffer(content);

  (currentStep || currentTest).attachments.push({
    name: name || "Attachment",
    content: isBuffer ? content.toString("base64") : content,
    encoding: isBuffer ? "base64" : "utf8",
    type,
  });
};

export const step = async (context: vitest.TaskContext, name: string, body: () => Promise<void>) => {
  injectAllureMeta(context);

  const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  const prevStep = currentStep;
  const nextStep: Partial<StepMetadata> = {
    name,
    steps: [],
    attachments: [],
  };

  (currentStep || currentTest).steps.push(nextStep as StepMetadata);
  (context.task.meta as AllureTestMeta).currentStep = nextStep as StepMetadata;

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

    (context.task.meta as AllureTestMeta).currentStep = prevStep;
  }
};

export const bindAllureApi = (task: vitest.Task): AllureVitestApi => {
  return {
    label: (name: string, value: string) => label({ task } as vitest.TaskContext, name, value),
    link: (type: string, url: string, name?: string) => link({ task } as vitest.TaskContext, type, url, name),
    parameter: (name: string, value: string, options?: ParameterOptions) =>
      parameter({ task } as vitest.TaskContext, name, value, options),
    description: (markdown: string) => description({ task } as vitest.TaskContext, markdown),
    descriptionHtml: (html: string) => descriptionHtml({ task } as vitest.TaskContext, html),
    testCaseId: (id: string) => testCaseId({ task } as vitest.TaskContext, id),
    historyId: (id: string) => historyId({ task } as vitest.TaskContext, id),
    allureId: (id: string) => allureId({ task } as vitest.TaskContext, id),
    displayName: (name: string) => displayName({ task } as vitest.TaskContext, name),
    attachment: (name: string, content: Buffer | string, type: string) =>
      attachment({ task } as vitest.TaskContext, name, content, type),
    issue: (name: string, url: string) => issue({ task } as vitest.TaskContext, name, url),
    tms: (name: string, url: string) => tms({ task } as vitest.TaskContext, name, url),
    epic: (name: string) => epic({ task } as vitest.TaskContext, name),
    feature: (name: string) => feature({ task } as vitest.TaskContext, name),
    story: (name: string) => story({ task } as vitest.TaskContext, name),
    suite: (name: string) => suite({ task } as vitest.TaskContext, name),
    parentSuite: (name: string) => parentSuite({ task } as vitest.TaskContext, name),
    subSuite: (name: string) => subSuite({ task } as vitest.TaskContext, name),
    owner: (name: string) => owner({ task } as vitest.TaskContext, name),
    severity: (name: string) => severity({ task } as vitest.TaskContext, name),
    layer: (name: string) => layer({ task } as vitest.TaskContext, name),
    tag: (name: string) => tag({ task } as vitest.TaskContext, name),
    step: (name: string, body: () => Promise<void>) => step({ task } as vitest.TaskContext, name, body),
  };
};
