/* eslint @typescript-eslint/require-await: off */
import { cwd } from "node:process";
import { type TaskContext, afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import {
  ContentType,
  LabelName,
  LinkType,
  ParameterOptions,
  TestPlanV1,
  extractMetadataFromString,
  parseTestPlan,
} from "allure-js-commons";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/internal";
import { Stage, Status } from "allure-js-commons/new";
import {
  MessagesHolder,
  RuntimeMessage,
  StepResult,
  TestHolder,
  TestResult,
  TestRuntime,
  createTestResult,
} from "allure-js-commons/new/sdk";
import { AllureNodeCrypto } from "allure-js-commons/new/sdk/node";
import { getTestFullName } from "./utils.js";

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

  messagesHolder = new MessagesHolder();

  crypto = new AllureNodeCrypto();

  constructor(context: TaskContext) {
    const testResult = createTestResult(this.crypto.uuid());

    testResult.name = context.task.name;

    this.currentTestHolder.currentTest = testResult;
  }

  sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
  }
}

export const label = async (name: string, value: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      labels: [{ name, value }],
    },
  });
};

export const link = async (type: string, url: string, name?: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      links: [{ type, url, name }],
    },
  });
};

export const epic = async (value: string) => {
  label(LabelName.EPIC, value);
};

export const feature = async (value: string) => {
  label(LabelName.FEATURE, value);
};

export const story = async (value: string) => {
  label(LabelName.STORY, value);
};

export const suite = async (value: string) => {
  label(LabelName.SUITE, value);
};

export const parentSuite = async (value: string) => {
  label(LabelName.PARENT_SUITE, value);
};

export const subSuite = async (value: string) => {
  label(LabelName.SUB_SUITE, value);
};

export const owner = async (value: string) => {
  label(LabelName.OWNER, value);
};

export const severity = async (value: string) => {
  label(LabelName.SEVERITY, value);
};

export const layer = async (value: string) => {
  label(LabelName.LAYER, value);
};

export const tag = async (value: string) => {
  label(LabelName.TAG, value);
};

export const allureId = async (value: string) => {
  label(LabelName.ALLURE_ID, value);
};

export const issue = async (name: string, url: string) => {
  link(LinkType.ISSUE, url, name);
};

export const tms = async (name: string, url: string) => {
  link(LinkType.TMS, url, name);
};

export const parameter = async (name: string, value: string, options?: ParameterOptions) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      parameters: [{ name, value, ...options }],
    },
  });
};

export const description = async (markdown: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      description: markdown,
    },
  });
};

export const descriptionHtml = async (html: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      descriptionHtml: html,
    },
  });
};

export const displayName = async (name: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      displayName: name,
    },
  });
};

export const historyId = async (value: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      historyId: value,
    },
  });
};

export const testCaseId = async (value: string) => {
  global.allureTestRuntime.sendMessage({
    type: "metadata",
    data: {
      testCaseId: value,
    },
  });
};

export const attachment = async (name: string, content: Buffer | string, type: ContentType) => {
  global.allureTestRuntime.sendMessage({
    type: "raw_attachment",
    data: {
      name,
      content: content instanceof Buffer ? content.toString("base64") : content,
      contentType: type,
    },
  });
};

export const step = async (name: string, body: () => Promise<void>) => {
  global.allureTestRuntime.sendMessage({
    type: "step_start",
    data: {
      name,
      start: Date.now(),
    },
  });

  try {
    await body();

    global.allureTestRuntime.sendMessage({
      type: "step_stop",
      data: {
        status: Status.PASSED,
        stage: Stage.FINISHED,
        stop: Date.now(),
      },
    });
  } catch (err) {
    global.allureTestRuntime.sendMessage({
      type: "step_stop",
      data: {
        status: Status.FAILED,
        stage: Stage.FINISHED,
        stop: Date.now(),
        statusDetails: {
          message: err.message,
          trace: err.stack,
        },
      },
    });

    throw err;
  }
};

const existsInTestPlan = (ctx: TaskContext, testPlan?: TestPlanV1) => {
  if (!testPlan) {
    return true;
  }

  const { name: testName } = ctx.task;
  const testFullName = getTestFullName(ctx.task, cwd());
  const { labels } = extractMetadataFromString(testName);
  const allureIdLabel = labels.find(({ name }) => name === LabelName.ALLURE_ID);

  return testPlan.tests.some(({ id, selector = "" }) => {
    const idMatched = id ? String(id) === allureIdLabel?.value : false;
    const selectorMatched = selector === testFullName;

    return idMatched || selectorMatched;
  });
};

beforeAll(() => {
  global.allureTestPlan = parseTestPlan();
});

afterAll(() => {
  global.allureTestPlan = undefined;
});

beforeEach(async (ctx) => {
  (ctx.task as any).meta = {
    ...ctx.task.meta,
    VITEST_POOL_ID: process.env.VITEST_POOL_ID,
  };

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

  if (!existsInTestPlan(ctx, global.allureTestPlan as TestPlanV1)) {
    await label(ALLURE_SKIPPED_BY_TEST_PLAN_LABEL as string, "true");
    // @ts-ignore
    ctx.task.meta.allureRuntimeMessages = global.allureTestRuntime.messagesHolder.messages.splice(0);
    ctx.skip();
    return;
  }
});

afterEach((ctx) => {
  // @ts-ignore
  ctx.task.meta.allureRuntimeMessages = global.allureTestRuntime.messagesHolder.messages.splice(0);

  global.allureTestRuntime = undefined;
});
