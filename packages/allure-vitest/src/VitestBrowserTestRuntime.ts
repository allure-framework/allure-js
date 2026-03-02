import type { AttachmentOptions } from "allure-js-commons";
import { uint8ArrayToBase64 } from "allure-js-commons/sdk";
import { BaseVitestTestRuntime } from "./runtime.js";

export class VitestBrowserTestRuntime extends BaseVitestTestRuntime {
  async attachment(name: string, content: Uint8Array | string, options: AttachmentOptions) {
    await this.sendMessage({
      type: "attachment_content",
      data: {
        name,
        content: content instanceof Uint8Array ? uint8ArrayToBase64(content) : btoa(content),
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
        content: content instanceof Uint8Array ? uint8ArrayToBase64(content) : btoa(content),
        encoding: "base64",
        contentType: options.contentType,
        fileExtension: options.fileExtension,
      },
    });
  }
}
