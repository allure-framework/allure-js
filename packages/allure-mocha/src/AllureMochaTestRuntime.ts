import {
  ReporterRuntime,
  Status,
  Stage,
  StatusDetails,
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
  constructor(private readonly reporterRuntime: ReporterRuntime) {
  }

  labels = async (...lablesList: Label[]) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        labels: lablesList
      }
    });
  };

  links = async (...linksList: Link[]) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        links: linksList
      }
    });
  };

  parameter = async (name: string, value: string, options?: ParameterOptions) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        parameters: [{name, value, ...options}]
      }
    });
  }

  description = async (markdown: string) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        description: markdown,
      }
    });
  }

  descriptionHtml = async (html: string) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        descriptionHtml: html,
      }
    });
  }

  displayName = async (name: string) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        displayName: name,
      }
    });
  }

  historyId = async (value: string) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        historyId: value,
      }
    });
  }

  testCaseId = async (value: string) => {
    await this.applyToCurrentTest({
      type: "metadata",
      data: {
        testCaseId: value,
      }
    });
  }

  attachment = async (name: string, content: string | Buffer, type: string) => {
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

  step = async (name: string, body: () => void | PromiseLike<void>) => {
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

  stepDisplayName = async (name: string) => {
    await this.applyToCurrentTest({
      type: "step_metadata",
      data: { name }
    });
  }

  stepParameter = async (name: string, value: string, mode?: ParameterMode | undefined) => {
    await this.applyToCurrentTest({
      type: "step_metadata",
      data: {
        parameters: [{name, value, mode}]
      }
    });
  }

  private applyToCurrentTest = async (message: RuntimeMessage) =>
    await this.reporterRuntime.applyRuntimeMessagesToCurrentScope([message]);
}
