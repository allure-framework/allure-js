import { world } from "@cucumber/cucumber";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class AllureCucumberTestRuntime extends MessageTestRuntime {
  sendMessageSync(message: RuntimeMessage) {
    world.attach(JSON.stringify(message), ALLURE_RUNTIME_MESSAGE_CONTENT_TYPE as string);
  }

  async sendMessage(message: RuntimeMessage) {
    this.sendMessageSync(message);
    await Promise.resolve();
  }
}
