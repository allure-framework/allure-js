import { RuntimeMessage } from "./model.js";

// should it be just stack? do we need additional abstraction for this?
export class MessagesHolder {
  messages: RuntimeMessage[] = [];

  push(message: RuntimeMessage) {
    this.messages.push(message);
  }

  pop(): RuntimeMessage | undefined {
    return this.messages.pop();
  }
}
