import {
  ContentType,
  Label,
  LabelName,
  Link,
  LinkType,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  Stage,
  Status,
  TestRuntime,
} from "allure-js-commons/sdk/node";
import { AllureCodeceptJsReporter } from "./reporter.js";

export class AllureCodeceptJsTestRuntime implements TestRuntime {
  constructor(private readonly reporter: AllureCodeceptJsReporter) {}

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

  async issue(url: string, name: string) {
    await this.link(url, LinkType.ISSUE, name);
  }

  async tms(url: string, name: string) {
    await this.link(url, LinkType.TMS, name);
  }

  async allureId(value: string) {
    await this.label(LabelName.ALLURE_ID, value);
  }

  async epic(name: string) {
    await this.label(LabelName.EPIC, name);
  }

  async feature(name: string) {
    await this.label(LabelName.FEATURE, name);
  }

  async story(name: string) {
    await this.label(LabelName.STORY, name);
  }

  async suite(name: string) {
    await this.label(LabelName.SUITE, name);
  }

  async parentSuite(name: string) {
    await this.label(LabelName.PARENT_SUITE, name);
  }

  async subSuite(name: string) {
    await this.label(LabelName.SUB_SUITE, name);
  }

  async owner(name: string) {
    await this.label(LabelName.OWNER, name);
  }

  async severity(name: string) {
    await this.label(LabelName.SEVERITY, name);
  }

  async layer(name: string) {
    await this.label(LabelName.LAYER, name);
  }

  async tag(name: string) {
    await this.label(LabelName.TAG, name);
  }

  async tags(...tagsList: string[]) {
    return this.labels(...tagsList.map((value) => ({ name: LabelName.TAG, value })));
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
      await this.sendMessage({
        type: "step_stop",
        data: {
          status: Status.FAILED,
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

  async stepDisplayName(name: string) {
    await this.sendMessage({
      type: "step_metadata",
      data: { name },
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode) {
    await this.sendMessage({
      type: "step_metadata",
      data: {
        parameters: [{ name, value, mode }],
      },
    });
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporter.handleRuntimeMessage(message);

    return Promise.resolve();
  }
}
