import { MessageTestRuntime, RuntimeMessage } from "allure-js-commons/sdk/node";

export class AllureVitestTestRuntime extends MessageTestRuntime {
  messagesHolder: RuntimeMessage[] = [];

  constructor() {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
    return Promise.resolve();
  }
}
