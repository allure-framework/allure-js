import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class MochaTestRuntime extends MessageTestRuntime {
  constructor(private readonly messageProcessor: (...messages: RuntimeMessage[]) => void) {
    super();
  }

  sendMessageSync(message: RuntimeMessage) {
    this.messageProcessor(message);
  }

  async sendMessage(message: RuntimeMessage) {
    this.sendMessageSync(message);
    return Promise.resolve();
  }
}
