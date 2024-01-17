import {
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  Stage,
  Status,
  StepMetadata,
} from "allure-js-commons";
import * as vitest from "vitest";

interface AllureTestMeta extends vitest.TaskMeta {
  currentTest: MetadataMessage;
  currentStep?: StepMetadata;
}

export const label = (context: vitest.TaskContext, name: string, value: string) => {
  (context.task.meta as AllureTestMeta).currentTest.labels!.push({ name, value });
};

export const link = (context: vitest.TaskContext, type: LinkType, url: string, name?: string) => {
  (context.task.meta as AllureTestMeta).currentTest.links!.push({ type, url, name });
};

export const epic = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.EPIC, value);
};

export const feature = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.FEATURE, value);
};

export const story = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.STORY, value);
};

export const suite = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.SUITE, value);
};

export const parentSuite = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.PARENT_SUITE, value);
};

export const subSuite = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.SUB_SUITE, value);
};

export const owner = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.OWNER, value);
};

export const severity = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.SEVERITY, value);
};

export const layer = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.LAYER, value);
};

export const tag = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.TAG, value);
};

export const allureId = (context: vitest.TaskContext, value: string) => {
  label(context, LabelName.ALLURE_ID, value);
};

export const issue = (context: vitest.TaskContext, name: string, url: string) => {
  link(context, LinkType.ISSUE, url, name);
};

export const tms = (context: vitest.TaskContext, name: string, url: string) => {
  link(context, LinkType.TMS, url, name);
};

export const parameter = (
  context: vitest.TaskContext,
  name: string,
  value: string,
  options?: ParameterOptions,
) => {
  (context.task.meta as AllureTestMeta).currentTest.parameter!.push({
    name,
    value,
    ...options,
  });
};

export const description = (context: vitest.TaskContext, markdown: string) => {
  (context.task.meta as AllureTestMeta).currentTest.description = markdown;
};

export const descriptionHtml = (context: vitest.TaskContext, html: string) => {
  (context.task.meta as AllureTestMeta).currentTest.descriptionHtml = html;
};

export const displayName = (context: vitest.TaskContext, name: string) => {
  (context.task.meta as AllureTestMeta).currentTest.displayName = name;
};

export const historyId = (context: vitest.TaskContext, value: string) => {
  (context.task.meta as AllureTestMeta).currentTest.historyId = value;
};

export const testCaseId = (context: vitest.TaskContext, value: string) => {
  (context.task.meta as AllureTestMeta).currentTest.testCaseId = value;
};

export const attachment = (
  context: vitest.TaskContext,
  name: string,
  content: Buffer | string,
  type: string,
) => {
  const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  const isBuffer = Buffer.isBuffer(content);

  (currentStep || currentTest).attachments!.push({
    name: name || "Attachment",
    content: isBuffer ? content.toString("base64") : content,
    encoding: isBuffer ? "base64" : "utf8",
    type,
  });
};

export const step = async (
  context: vitest.TaskContext,
  name: string,
  body: () => Promise<void>,
) => {
  const { currentTest, currentStep } = context.task.meta as AllureTestMeta;
  const prevStep = currentStep;
  const nextStep: Partial<StepMetadata> = {
    name,
    steps: [],
    attachments: [],
  };

  (currentStep || currentTest).steps!.push(nextStep as StepMetadata);
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

export const bindAllureApi = (task: vitest.Task) => {
  return {
    label: (name: string, value: string) => {
      label({ task } as vitest.TaskContext, name, value);
    },
    link: (type: LinkType, url: string, name?: string) => {
      link({ task } as vitest.TaskContext, type, url, name);
    },
    parameter: (name: string, value: string, options?: ParameterOptions) => {
      parameter({ task } as vitest.TaskContext, name, value, options);
    },
    description: (markdown: string) => {
      description({ task } as vitest.TaskContext, markdown);
    },
    descriptionHtml: (html: string) => {
      descriptionHtml({ task } as vitest.TaskContext, html);
    },
    testCaseId: (id: string) => {
      testCaseId({ task } as vitest.TaskContext, id);
    },
    historyId: (id: string) => {
      historyId({ task } as vitest.TaskContext, id);
    },
    allureId: (id: string) => {
      allureId({ task } as vitest.TaskContext, id);
    },
    displayName: (name: string) => {
      displayName({ task } as vitest.TaskContext, name);
    },
    attachment: (name: string, content: Buffer | string, type: string) => {
      attachment({ task } as vitest.TaskContext, name, content, type);
    },
    issue: (name: string, url: string) => {
      issue({ task } as vitest.TaskContext, name, url);
    },
    tms: (name: string, url: string) => {
      tms({ task } as vitest.TaskContext, name, url);
    },
    epic: (name: string) => {
      epic({ task } as vitest.TaskContext, name);
    },
    feature: (name: string) => {
      feature({ task } as vitest.TaskContext, name);
    },
    story: (name: string) => {
      story({ task } as vitest.TaskContext, name);
    },
    suite: (name: string) => {
      suite({ task } as vitest.TaskContext, name);
    },
    parentSuite: (name: string) => {
      parentSuite({ task } as vitest.TaskContext, name);
    },
    subSuite: (name: string) => {
      subSuite({ task } as vitest.TaskContext, name);
    },
    owner: (name: string) => {
      owner({ task } as vitest.TaskContext, name);
    },
    severity: (name: string) => {
      severity({ task } as vitest.TaskContext, name);
    },
    layer: (name: string) => {
      layer({ task } as vitest.TaskContext, name);
    },
    tag: (name: string) => {
      tag({ task } as vitest.TaskContext, name);
    },
    step: (name: string, body: () => Promise<void>) => {
      step({ task } as vitest.TaskContext, name, body);
    },
  };
};
