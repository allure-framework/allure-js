import type { AttachmentOptions } from "allure-js-commons";
import { BaseVitestTestRuntime } from "./runtime.js";

export class VitestTestRuntime extends BaseVitestTestRuntime {
  async attachment(name: string, content: Buffer | Uint8Array | string, options: AttachmentOptions) {
    const bufferContent =
      typeof content === "string"
        ? Buffer.from(content, options.encoding)
        : content instanceof Uint8Array
          ? Buffer.from(content)
          : content;

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
    const bufferContent =
      typeof content === "string"
        ? Buffer.from(content, options.encoding)
        : content instanceof Uint8Array
          ? Buffer.from(content)
          : content;

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
}
