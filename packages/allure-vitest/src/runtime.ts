/* eslint @typescript-eslint/require-await: off */
import { MessageTestRuntime, MessagesHolder, RuntimeMessage } from "allure-js-commons/sdk/node";

export class AllureVitestTestRuntime extends MessageTestRuntime {
  readonly messagesHolder = new MessagesHolder();

  constructor() {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
  }
}
