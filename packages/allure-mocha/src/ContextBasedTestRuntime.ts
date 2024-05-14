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
  Link,
  setGlobalTestRuntime,
} from "allure-js-commons/new/sdk/node";
import { errorToStatusDetails } from "./utils";

export class ContextBasedTestRuntime implements TestRuntime {

  constructor(private readonly reporterRuntime: ReporterRuntime) { }

  labels = async (...lablesList: Label[]) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        labels: lablesList
      }
    });
  };

  links = async (...linksList: Link[]) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        links: linksList
      }
    });
  };

  parameter = async (name: string, value: string, options?: ParameterOptions) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        parameters: [{name, value, ...options}]
      }
    });
  }

  description = async (markdown: string) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        description: markdown,
      }
    });
  }

  descriptionHtml = async (html: string) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        descriptionHtml: html,
      }
    });
  }

  displayName = async (name: string) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        displayName: name,
      }
    });
  }

  historyId = async (value: string) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        historyId: value,
      }
    });
  }

  testCaseId = async (value: string) => {
    await this.applyToContext({
      type: "metadata",
      data: {
        testCaseId: value,
      }
    });
  }

  attachment = async (name: string, content: string | Buffer, type: string) => {
    await this.applyToContext({
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

    await this.applyToContext({
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
      await this.applyToContext({
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
    await this.applyToContext({
      type: "step_metadata",
      data: { name }
    });
  }

  stepParameter = async (name: string, value: string, mode?: ParameterMode | undefined) => {
    await this.applyToContext({
      type: "step_metadata",
      data: {
        parameters: [{name, value, mode}]
      }
    });
  }

  private applyToContext = async (message: RuntimeMessage) =>
    this.reporterRuntime.applyRuntimeMessages([message]);
}

export const setUpTestRuntime = (reporterRuntime: ReporterRuntime) =>
  setGlobalTestRuntime(new ContextBasedTestRuntime(reporterRuntime));
