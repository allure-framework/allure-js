import { RuntimeMessage } from "./model.js";
import { TestHolder } from "./TestHolder.js";
import { MessagesHolder } from "./MessageHolder.js";

export interface TestRuntime<T = unknown> {
  currentTestHolder?: TestHolder<T>;

  messagesHolder?: MessagesHolder;

  sendMessage: (message: RuntimeMessage) => void | Promise<void>;
}
