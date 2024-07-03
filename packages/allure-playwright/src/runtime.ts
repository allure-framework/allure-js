import { test } from "@playwright/test";
import type { AttachmentOptions } from "allure-js-commons";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class AllurePlaywrightTestRuntime extends MessageTestRuntime {
  constructor() {
    super();
  }

  async step<T = void>(name: string, body: () => T | PromiseLike<T>) {
    return await test.step(name, () => Promise.resolve(body()));
  }

  async attachment(name: string, content: Buffer | string, options: AttachmentOptions) {
    await test.info().attach(name, { body: content, contentType: options.contentType });
  }

  async attachmentFromPath(name: string, path: string, options: AttachmentOptions) {
    await test.info().attach(name, { path, contentType: options.contentType });
  }

  async sendMessage(message: RuntimeMessage) {
    await test.info().attach(`Allure Metadata (${message.type})`, {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(message), "utf8"),
    });
  }
}
