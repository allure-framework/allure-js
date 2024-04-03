import { RuntimeMessage } from "./model.js";

export interface TestRuntime<T = unknown> {
  sendMessage: (message: RuntimeMessage) => void | Promise<void>;
}
