import test from "@playwright/test";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/internal";
import { MessageTestRuntime, RuntimeMessage } from "allure-js-commons/sdk/node";

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
