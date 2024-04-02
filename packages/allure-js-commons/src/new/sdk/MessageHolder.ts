import { RuntimeMessage } from "./model.js";

export class MessagesHolder {
  messages: RuntimeMessage[] = [];

  push(message: RuntimeMessage) {
    this.messages.push(message);
  }

  pop(): RuntimeMessage | undefined {
    return this.messages.pop();
  }
}
