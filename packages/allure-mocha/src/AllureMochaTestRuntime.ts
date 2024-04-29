import {
  ReporterRuntime,
  Status,
  Stage,
  StatusDetails,
  LabelName,
  ParameterMode,
  ParameterOptions,
  RuntimeMessage,
  TestRuntime,
  getStatusFromError,
  Label,
  Link
} from "allure-js-commons/new/sdk/node";
import { errorToStatusDetails } from "./utils";

export class AllureMochaTestRuntime implements TestRuntime {
  private currentTestUuid: string | null = null;

  constructor(private readonly reporterRuntime: ReporterRuntime) {
  }

  getCurrentTest() {
    return this.currentTestUuid;
  }

  setCurrentTest(uuid: string) {
    this.currentTestUuid = uuid;
  }

  clearCurrentTest() {
    this.currentTestUuid = null;
  }

  async label(name: LabelName, value: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        labels: [{name, value}]
      }
    });
  };

  async labels(...lablesList: Label[]) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        labels: lablesList
      }
    });
  };

  async link(url: string, type?: string, name?: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        links: [{url, type, name}]
      }
    });
  }

  async links(...linksList: Link[]) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        links: linksList
      }
    });
  };

  async parameter(name: string, value: string, options?: ParameterOptions) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        parameters: [{name, value, ...options}]
      }
    });
  }

  async description(markdown: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        description: markdown,
      }
    });
  }

  async descriptionHtml(html: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        descriptionHtml: html,
      }
    });
  }

  async displayName(name: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        displayName: name,
      }
    });
  }

  async historyId(value: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        historyId: value,
      }
    });
  }

  async testCaseId(value: string) {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        testCaseId: value,
      }
    });
  }

  async attachment(name: string, content: string | Buffer, type: string) {
    await this.applyToCurrentTest({
      type: "raw_attachment",
      data: {
        name,
        content: Buffer.from(content).toString("base64"),
        contentType: type,
        encoding: "base64",
      }
    });
  }

  async step(name: string, body: () => void | PromiseLike<void>) {
    let status = Status.PASSED;
    let statusDetails: StatusDetails | undefined;

    await this.applyToCurrentTest({
      type: "step_start",
      data: {
        name,
        start: Date.now(),
      },
    });

    try {
      await body();
    } catch (err) {
      status = err instanceof Error ? getStatusFromError(err) : Status.BROKEN;
      statusDetails = errorToStatusDetails(err);
      throw err;
    } finally {
      await this.applyToCurrentTest({
        type: "step_stop",
        data: {
          status,
          stage: Stage.FINISHED,
          stop: Date.now(),
          statusDetails,
        },
      });
    }
  }

  async stepDisplayName(name: string) {
    await this.applyToCurrentTest({
      type: "step_metadata",
      data: { name }
    });
  }

  async stepParameter(name: string, value: string, mode?: ParameterMode | undefined) {
    await this.applyToCurrentTest({
      type: "step_metadata",
      data: {
        parameters: [{name, value, mode}]
      }
    });
  }

  private async applyToCurrentTest(message: RuntimeMessage) {
    if (this.currentTestUuid) {
      await this.reporterRuntime.applyRuntimeMessages(this.currentTestUuid, [message]);
    } else {
      // Log "No test is active"?
    }
  }
}
