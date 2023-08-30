import type { JestExpect } from "@jest/expect";
import type { Global } from "@jest/types";
import {
  AllureCommandStepExecutable,
  AllureRuntimeApiInterface,
  LabelName,
  LinkType,
  MetadataMessage,
  ParameterOptions,
  StepBodyFunction,
} from "allure-js-commons";
import type { AllureEnvironment } from "./AllureJest";

export class AllureJestApi implements AllureRuntimeApiInterface {
  env: AllureEnvironment;
  context: Global.Global;

  constructor(env: AllureEnvironment, context: Global.Global) {
    this.env = env;
    this.context = context;
  }

  async sendMetadata(metadata: MetadataMessage) {
    const { currentTestName, currentConcurrentTestName } = (
      this.context.expect as JestExpect
    ).getState();
    const testName = currentTestName || currentConcurrentTestName?.getStore?.();

    return new Promise((resolve) => {
      this.env.handleAllureMetadata({
        currentTestName: testName as string,
        metadata,
      });

      return resolve(void 0);
    });
  }

  label(name: string, value: string): void {
    this.sendMetadata({
      labels: [
        {
          name,
          value,
        },
      ],
    });
  }

  parameter(name: string, value: any, options?: ParameterOptions): void {
    this.sendMetadata({
      parameter: [
        {
          name,
          value,
          ...options,
        },
      ],
    });
  }

  attachment(content: string | Buffer, type: string): void {
    const isBuffer = Buffer.isBuffer(content);

    this.sendMetadata({
      attachments: [
        {
          name: "Attachment",
          content: isBuffer ? content.toString("base64") : content,
          encoding: isBuffer ? "base64" : "utf8",
          type,
        },
      ],
    });
  }

  link(url: string, name?: string, type?: string): void {
    this.sendMetadata({
      links: [
        {
          name,
          type,
          url,
        },
      ],
    });
  }

  async step(name: string, body: StepBodyFunction) {
    const step = new AllureCommandStepExecutable(name);

    await step.run(body, async (message: MetadataMessage) => {
      await this.sendMetadata(message);
    });
  }

  async displayName(name: string) {
    await this.sendMetadata({
      displayName: name,
    });
  }

  epic(epic: string): void {
    this.label(LabelName.EPIC, epic);
  }

  feature(feature: string): void {
    this.label(LabelName.FEATURE, feature);
  }

  story(story: string): void {
    this.label(LabelName.STORY, story);
  }

  suite(name: string): void {
    this.label(LabelName.SUITE, name);
  }

  parentSuite(name: string): void {
    this.label(LabelName.PARENT_SUITE, name);
  }

  subSuite(name: string): void {
    this.label(LabelName.SUB_SUITE, name);
  }

  owner(owner: string): void {
    this.label(LabelName.OWNER, owner);
  }

  severity(severity: string): void {
    this.label(LabelName.SEVERITY, severity);
  }

  layer(layer: string): void {
    this.label(LabelName.LAYER, layer);
  }

  id(allureId: string): void {
    this.label(LabelName.ALLURE_ID, allureId);
  }

  tag(tag: string): void {
    this.label(LabelName.TAG, tag);
  }

  issue(name: string, url: string): void {
    this.link(url, name, LinkType.ISSUE);
  }

  tms(name: string, url: string): void {
    this.link(url, name, LinkType.TMS);
  }

  description(markdown: string): void {
    this.sendMetadata({
      description: markdown,
    });
  }

  descriptionHtml(html: string): void {
    this.sendMetadata({
      descriptionHtml: html,
    });
  }

  testCaseId(testCaseId: string): void {
    this.sendMetadata({
      testCaseId,
    });
  }

  historyId(historyId: string): void {
    this.sendMetadata({
      historyId,
    });
  }
}
