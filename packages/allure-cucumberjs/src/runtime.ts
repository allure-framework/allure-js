import { World } from "@cucumber/cucumber";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/internal";
import {
  ContentType,
  Label,
  LabelName,
  Link,
  LinkType,
  MessagesHolder,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
  getStatusFromError,
} from "allure-js-commons/sdk/node";

export class AllureCucumberTestRuntime extends World implements TestRuntime {
  messagesHolder = new MessagesHolder();

  async label(name: LabelName | string, value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels: [{ name, value }],
      },
    });
  }

  async labels(...labels: Label[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        labels,
      },
    });
  }

  async link(url: string, type?: LinkType | string, name?: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links: [{ type, url, name }],
      },
    });
  }

  async links(...links: Link[]) {
    await this.sendMessage({
      type: "metadata",
      data: {
        links,
      },
    });
  }

  async parameter(name: string, value: string, options?: ParameterOptions) {
    await this.sendMessage({
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
    await this.sendMessage({
      type: "metadata",
      data: {
        description: markdown,
      },
    });
  }

  async descriptionHtml(html: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        descriptionHtml: html,
      },
    });
  }

  async displayName(name: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        displayName: name,
      },
    });
  }

  async historyId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        historyId: value,
      },
    });
  }

  async testCaseId(value: string) {
    await this.sendMessage({
      type: "metadata",
      data: {
        testCaseId: value,
      },
    });
  }

  async attachment(name: string, content: Buffer | string, type: string | ContentType) {
    await this.sendMessage({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      },
    });
  }

  async step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      const result = await body();

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
      return result;
    } catch (err) {
      const status = getStatusFromError(err as Error);

      await this.sendMessage({
        type: "step_stop",
        data: {
          status,
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails: {
            message: (err as Error).message,
            trace: (err as Error).stack,
          },
        },
      });

      throw err;
    }
  }

  issue(url: string, name: string) {
    this.link(url, LinkType.ISSUE, name);
  }

  tms(url: string, name: string) {
    this.link(url, LinkType.TMS, name);
  }

  allureId(value: string) {
    this.label(LabelName.ALLURE_ID, value);
  }

  epic(name: string) {
    this.label(LabelName.EPIC, name);
  }

  feature(name: string) {
    this.label(LabelName.FEATURE, name);
  }

  story(name: string) {
    this.label(LabelName.STORY, name);
  }

  suite(name: string) {
    this.label(LabelName.SUITE, name);
  }

  parentSuite(name: string) {
    this.label(LabelName.PARENT_SUITE, name);
  }

  subSuite(name: string) {
    this.label(LabelName.SUB_SUITE, name);
  }

  owner(name: string) {
    this.label(LabelName.OWNER, name);
  }

  severity(name: string) {
    this.label(LabelName.SEVERITY, name);
  }

  layer(name: string) {
    this.label(LabelName.LAYER, name);
  }

  tag(name: string) {
    this.label(LabelName.TAG, name);
  }

  tags(...tagsList: string[]) {
    this.labels(...tagsList.map((value) => ({ name: LabelName.TAG, value })));
  }

  async stepDisplayName() {}

  async stepParameter() {}

  sendMessage(message: RuntimeMessage) {
    this.attach(JSON.stringify(message), ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE as string);

    return Promise.resolve();
  }
}
