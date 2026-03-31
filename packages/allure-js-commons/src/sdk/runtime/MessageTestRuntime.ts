/* eslint @typescript-eslint/require-await: off */
import {
  type AttachmentOptions,
  type Label,
  type LabelName,
  type Link,
  type LinkType,
  type ParameterMode,
  type ParameterOptions,
  Status,
  type StatusDetails,
} from "../../model.js";
import type { RuntimeMessage } from "../types.js";
import { getMessageAndTraceFromError, getStatusFromError, isPromise } from "../utils.js";
import { noopSyncRuntime, SYNC_STEP_PURE_FUNCTION_ERROR } from "./NoopTestRuntime.js";
import type { SyncTestRuntime, TestRuntime } from "./types.js";

const toAttachmentBuffer = (content: Buffer | Uint8Array | string, encoding?: BufferEncoding) =>
  typeof content === "string"
    ? Buffer.from(content, encoding)
    : content instanceof Uint8Array
      ? Buffer.from(content)
      : content;

export abstract class BaseMessageTestRuntime implements TestRuntime {
  private cachedSyncRuntime?: SyncTestRuntime;

  get sync(): SyncTestRuntime | undefined {
    const sendMessageSync = this.sendMessageSync;

    if (!sendMessageSync) {
      return undefined;
    }

    return (this.cachedSyncRuntime ??= this.createSyncRuntime((message) => sendMessageSync.call(this, message)));
  }

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async attachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    throw new Error("Not implemented");
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async globalAttachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    throw new Error("Not implemented");
  }

  async globalAttachmentFromPath(name: string, path: string, options: Omit<AttachmentOptions, "encoding">) {
    await this.sendMessage({
      type: "global_attachment_path",
      data: {
        name,
        path,
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  async globalError(details: StatusDetails) {
    await this.sendMessage({
      type: "global_error",
      data: details,
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

  async stage(name: string) {
    await this.sendMessage({
      type: "stage_start",
      data: {
        name,
        start: Date.now(),
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

  protected createSyncPromiseError() {
    const error = new Error(SYNC_STEP_PURE_FUNCTION_ERROR);
    noopSyncRuntime.warnAboutPromiseStep();
    return error;
  }

  protected createSyncRuntime(sendMessageSync: (message: RuntimeMessage) => void): SyncTestRuntime {
    return {
      labels: (...labels) =>
        sendMessageSync({
          type: "metadata",
          data: {
            labels,
          },
        }),
      links: (...links) =>
        sendMessageSync({
          type: "metadata",
          data: {
            links,
          },
        }),
      parameter: (name, value, options) =>
        sendMessageSync({
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
        }),
      description: (markdown) =>
        sendMessageSync({
          type: "metadata",
          data: {
            description: markdown,
          },
        }),
      descriptionHtml: (html) =>
        sendMessageSync({
          type: "metadata",
          data: {
            descriptionHtml: html,
          },
        }),
      displayName: (name) =>
        sendMessageSync({
          type: "metadata",
          data: {
            displayName: name,
          },
        }),
      historyId: (value) =>
        sendMessageSync({
          type: "metadata",
          data: {
            historyId: value,
          },
        }),
      testCaseId: (value) =>
        sendMessageSync({
          type: "metadata",
          data: {
            testCaseId: value,
          },
        }),
      attachment: (name, content, options) => this.syncAttachment(sendMessageSync, name, content, options),
      globalAttachment: (name, content, options) => this.syncGlobalAttachment(sendMessageSync, name, content, options),
      globalAttachmentFromPath: (name, path, options) =>
        sendMessageSync({
          type: "global_attachment_path",
          data: {
            name,
            path,
            contentType: options.contentType,
            fileExtension: options.fileExtension,
          },
        }),
      globalError: (details) =>
        sendMessageSync({
          type: "global_error",
          data: details,
        }),
      attachmentFromPath: (name, path, options) =>
        sendMessageSync({
          type: "attachment_path",
          data: {
            name,
            path,
            contentType: options.contentType,
            fileExtension: options.fileExtension,
            wrapInStep: true,
            timestamp: Date.now(),
          },
        }),
      logStep: (name, status = Status.PASSED, error) => {
        const timestamp = Date.now();
        sendMessageSync({
          type: "step_start",
          data: {
            name,
            start: timestamp,
          },
        });
        sendMessageSync({
          type: "step_stop",
          data: {
            status,
            stop: timestamp,
            statusDetails: error
              ? {
                  ...getMessageAndTraceFromError(error),
                }
              : undefined,
          },
        });
      },
      step: (name, body) => {
        sendMessageSync({
          type: "step_start",
          data: {
            name,
            start: Date.now(),
          },
        });

        try {
          const result = body();
          if (isPromise(result)) {
            throw this.createSyncPromiseError();
          }

          sendMessageSync({
            type: "step_stop",
            data: {
              status: Status.PASSED,
              stop: Date.now(),
            },
          });

          return result;
        } catch (err) {
          const error = err as Error;
          const details = getMessageAndTraceFromError(error);
          const status = error.message === SYNC_STEP_PURE_FUNCTION_ERROR ? Status.BROKEN : getStatusFromError(error);

          sendMessageSync({
            type: "step_stop",
            data: {
              status,
              stop: Date.now(),
              statusDetails: {
                ...details,
              },
            },
          });

          throw err;
        }
      },
      stepDisplayName: (name) =>
        sendMessageSync({
          type: "step_metadata",
          data: { name },
        }),
      stepParameter: (name, value, mode) =>
        sendMessageSync({
          type: "step_metadata",
          data: {
            parameters: [{ name, value, mode }],
          },
        }),
    };
  }

  protected syncAttachment(
    _: (message: RuntimeMessage) => void,
    name: string,
    content: Buffer | Uint8Array | string,
    options: AttachmentOptions,
  ) {
    noopSyncRuntime.attachment(name, content, options);
  }

  protected syncGlobalAttachment(
    _: (message: RuntimeMessage) => void,
    name: string,
    content: Buffer | Uint8Array | string,
    options: AttachmentOptions,
  ) {
    noopSyncRuntime.globalAttachment(name, content, options);
  }

  sendMessageSync?(message: RuntimeMessage): void;

  abstract sendMessage(message: RuntimeMessage): Promise<void>;
}

export abstract class MessageTestRuntime extends BaseMessageTestRuntime {
  async attachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    const bufferContent = toAttachmentBuffer(content, options.encoding);

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

  async globalAttachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    const bufferContent = toAttachmentBuffer(content, options.encoding);

    await this.sendMessage({
      type: "global_attachment_content",
      data: {
        name,
        content: bufferContent.toString("base64"),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  protected override syncAttachment(
    sendMessageSync: (message: RuntimeMessage) => void,
    name: string,
    content: Buffer | Uint8Array | string,
    options: AttachmentOptions,
  ) {
    const bufferContent = toAttachmentBuffer(content, options.encoding);

    sendMessageSync({
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

  protected override syncGlobalAttachment(
    sendMessageSync: (message: RuntimeMessage) => void,
    name: string,
    content: Buffer | Uint8Array | string,
    options: AttachmentOptions,
  ) {
    const bufferContent = toAttachmentBuffer(content, options.encoding);

    sendMessageSync({
      type: "global_attachment_content",
      data: {
        name,
        content: bufferContent.toString("base64"),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }
}
