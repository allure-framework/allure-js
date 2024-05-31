import test from "@playwright/test";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class AllurePlaywrightTestRuntime extends MessageTestRuntime {
  constructor() {
    super();
  }
  async sendMessage(message: RuntimeMessage) {
    // @ts-ignore
    await test.info().attach("allure-metadata.json", {
      contentType: ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE,
      body: Buffer.from(JSON.stringify(message), "utf8"),
    });
  }
}
