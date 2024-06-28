import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class MochaTestRuntime extends MessageTestRuntime {
  constructor(private readonly messageProcessor: (...messages: RuntimeMessage[]) => void) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.messageProcessor(message);
    return Promise.resolve();
  }
}
