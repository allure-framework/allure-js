import {
  type AttachmentOptions,
  type Label,
  type LabelName,
  type Link,
  type LinkType,
  type ParameterMode,
  type ParameterOptions,
  Status,
} from "../../model.js";
import type { RuntimeMessage } from "../types.js";
import { getMessageAndTraceFromError, getStatusFromError } from "../utils.js";
import type { TestRuntime } from "./types.js";

export abstract class MessageTestRuntime implements TestRuntime {
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

  async attachment(name: string, content: Buffer | string, options: AttachmentOptions) {
    const bufferContent = typeof content === "string" ? Buffer.from(content, options.encoding) : content;
    await this.sendMessage({
      type: "attachment_content",
      data: {
        name,
        content: bufferContent.toString("base64"),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
        wrapInStep: true,
        timestamp: Date.now(),
      },
    });
  }

  async attachmentFromPath(name: string, path: string, options: AttachmentOptions) {
    await this.sendMessage({
      type: "attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
        wrapInStep: true,
        timestamp: Date.now(),
      },
    });
  }

  async logStep(name: string, status: Status = Status.PASSED, error?: Error) {
    const timestamp = Date.now();
    await this.sendMessage({
      type: "step_start",
      data: {
        name,
        start: timestamp,
      },
    });
    await this.sendMessage({
      type: "step_stop",
      data: {
        status: status,
        stop: timestamp,
        statusDetails: error
          ? {
              ...getMessageAndTraceFromError(error),
            }
          : undefined,
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
          stop: Date.now(),
        },
      });

      return result;
    } catch (err) {
      const details = getMessageAndTraceFromError(err as Error);

      await this.sendMessage({
        type: "step_stop",
        data: {
          status: getStatusFromError(err as Error),
          stop: Date.now(),
          statusDetails: {
            ...details,
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

  abstract sendMessage(message: RuntimeMessage): Promise<void>;
}
