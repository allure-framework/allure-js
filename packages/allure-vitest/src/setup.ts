/* eslint @typescript-eslint/require-await: off */
import { cwd } from "node:process";
import { type TaskContext, afterAll, afterEach, beforeAll, beforeEach } from "vitest";
import { ALLURE_SKIPPED_BY_TEST_PLAN_LABEL } from "allure-js-commons/new/internal";
import {
  ContentType,
  LabelName,
  LinkType,
  MessagesHolder,
  ParameterMode,
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

  async stepDisplayName(name: string) {
    this.sendMessage({
      type: "step_metadata",
      data: { name },
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    this.sendMessage({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
  }
}

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

  setGlobalTestRuntime(new AllureVitestTestRuntime());
});

afterEach((ctx) => {
  // @ts-ignore
  ctx.task.meta.allureRuntimeMessages = getGlobalTestRuntime().messagesHolder.messages;

  setGlobalTestRuntime(undefined);
});
