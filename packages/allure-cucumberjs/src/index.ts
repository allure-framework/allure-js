import { Before, World } from "@cucumber/cucumber";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/new/internal";
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
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";

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

  async step(name: string, body: () => void | PromiseLike<void>) {
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      await body();

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.PASSED,
          stage: Stage.FINISHED,
          stop: Date.now(),
        },
      });
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

  async stepDisplayName(name: string) {}

  async stepParameter(name: string, value: string) {}

  sendMessage(message: RuntimeMessage) {
    this.attach(JSON.stringify(message), ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE as string);

    return Promise.resolve();
  }
}

Before(function () {
  // TODO: we can implement testplan logic there

  setGlobalTestRuntime(
    new AllureCucumberTestRuntime({
      attach: this.attach,
      log: this.log,
      parameters: this.parameters,
    }),
  );
});
