/* eslint @typescript-eslint/require-await: off */
import { cwd } from "node:process";
import { type TaskContext, afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/new/internal";
import {
  ContentType,
  LabelName,
  LinkType,
  MessagesHolder,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestPlanV1,
  TestRuntime,
  extractMetadataFromString,
  getGlobalTestRuntime,
  parseTestPlan,
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";
import { getTestFullName } from "./utils.js";

// TODO: should be in `allure-js-commons`
declare global {
  // eslint-disable-next-line no-var
  var allure: {
    label: (name: string, value: string) => Promise<void>;
    link: (url: string, type?: string, name?: string) => Promise<void>;
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
}

export class AllureVitestTestRuntime implements TestRuntime {
  messagesHolder = new MessagesHolder();

  async label(name: LabelName | string, value: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  async link(url: string, type?: LinkType | string, name?: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  async parameter(name: string, value: string, options?: ParameterOptions) {
    this.sendMessage({
      type: "metadata",
      data: {
        parameters: [
          {
            name,
            value,
            ...options,
          },
        ],
      },
    });
  }

  async description(markdown: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  async descriptionHtml(html: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  async displayName(name: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  async historyId(value: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  async testCaseId(value: string) {
    this.sendMessage({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  async attachment(name: string, content: Buffer | string, type: string | ContentType) {
    this.sendMessage({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      },
    });
  }

  async step(name: string, body: () => void | Promise<void>) {
    this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      await body();

      this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
    } catch (err) {
      this.sendMessage({
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
  }

  sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
  }
}

export const label = async (name: LabelName | string, value: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.label(name, value);
};

export const link = async (url: string, type?: LinkType | string, name?: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.link(url, type, name);
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

export const issue = async (url: string, name: string) => {
  await link(url, LinkType.ISSUE, name);
};

export const tms = async (url: string, name: string) => {
  await link(url, LinkType.TMS, name);
};

export const parameter = async (name: string, value: string, options?: ParameterOptions) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.parameter(name, value, options);
};

export const description = async (markdown: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.description(markdown);
};

export const descriptionHtml = async (html: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.descriptionHtml(html);
};

export const displayName = async (name: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.displayName(name);
};

export const historyId = async (value: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.historyId(value);
};

export const testCaseId = async (value: string) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.testCaseId(value);
};

export const attachment = async (name: string, content: Buffer | string, type: ContentType) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  allureTestRuntime.attachment(name, content, type);
};

export const step = async (name: string, body: () => Promise<void>) => {
  const allureTestRuntime = getGlobalTestRuntime();

  if (!allureTestRuntime) {
    throw new Error("Allure test runtime is not initialized!");
  }

  await allureTestRuntime.step(name, body);
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

  if (!existsInTestPlan(ctx, global.allureTestPlan as TestPlanV1)) {
    // @ts-ignore
    ctx.task.meta.allureRuntimeMessages = [
      {
        type: "metadata",
        data: {
          labels: [{ name: ALLURE_SKIPPED_BY_TEST_PLAN_LABEL, value: "true" }],
        },
      },
    ];
    ctx.skip();
    return;
  }

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
  setGlobalTestRuntime(new AllureVitestTestRuntime());
});

afterEach((ctx) => {
  // @ts-ignore
  ctx.task.meta.allureRuntimeMessages = getGlobalTestRuntime().messagesHolder.messages;

  setGlobalTestRuntime(undefined);
});
