import type { AttachmentOptions } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";

import { BaseVitestTestRuntime } from "./runtime.js";

const toBufferContent = (content: Buffer | Uint8Array | string, encoding?: BufferEncoding) =>
  typeof content === "string"
    ? Buffer.from(content, encoding)
    : content instanceof Uint8Array
      ? Buffer.from(content)
      : content;

export class VitestTestRuntime extends BaseVitestTestRuntime {
  async attachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    const bufferContent = toBufferContent(content, options.encoding);

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
    const bufferContent = toBufferContent(content, options.encoding);

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
    const bufferContent = toBufferContent(content, options.encoding);

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
    const bufferContent = toBufferContent(content, options.encoding);

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
