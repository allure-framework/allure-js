import type { AttachmentOptions } from "allure-js-commons";
import { type RuntimeMessage, uint8ArrayToBase64 } from "allure-js-commons/sdk";

import { BaseVitestTestRuntime } from "./runtime.js";

const toBase64Content = (content: Uint8Array | string) =>
  content instanceof Uint8Array ? uint8ArrayToBase64(content) : btoa(content);

export class VitestBrowserTestRuntime extends BaseVitestTestRuntime {
  async attachment(name: string, content: Uint8Array | string, options: AttachmentOptions) {
    await this.sendMessage({
      type: "attachment_content",
      data: {
        name,
        content: toBase64Content(content),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
        wrapInStep: true,
        timestamp: Date.now(),
      },
    });
  }

  async globalAttachment(name: string, content: Uint8Array | string, options: AttachmentOptions) {
    await this.sendMessage({
      type: "global_attachment_content",
      data: {
        name,
        content: toBase64Content(content),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }

  protected override syncAttachment(
    sendMessageSync: (message: RuntimeMessage) => void,
    name: string,
    content: Uint8Array | string,
    options: AttachmentOptions,
  ) {
    sendMessageSync({
      type: "attachment_content",
      data: {
        name,
        content: toBase64Content(content),
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
    content: Uint8Array | string,
    options: AttachmentOptions,
  ) {
    sendMessageSync({
      type: "global_attachment_content",
      data: {
        name,
        content: toBase64Content(content),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }
}
