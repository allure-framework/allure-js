import type { RuntimeMessage } from "../types.js";
import { MessageTestRuntime } from "./MessageTestRuntime.js";

export class MessageHolderTestRuntime extends MessageTestRuntime {
  private messagesHolder: RuntimeMessage[] = [];

  async sendMessage(message: RuntimeMessage) {
    this.messagesHolder.push(message);
    return Promise.resolve();
  }

  messages(): RuntimeMessage[] {
    return [...this.messagesHolder];
  }
}
