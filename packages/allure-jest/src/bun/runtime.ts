import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

import { last } from "../utils.js";
import type { BunFileContext } from "./types.js";

export class BunTestRuntime extends MessageTestRuntime {
  private context: BunFileContext | null = null;

  setContext(context: BunFileContext) {
    this.context = context;
  }

  async sendMessage(message: RuntimeMessage) {
    if (!this.context) {
      return;
    }

    const { runtime, executables } = this.context;
    const executableUuid = last(executables);

    if (executableUuid) {
      runtime.applyRuntimeMessages(executableUuid, [message]);
    } else {
      runtime.applyGlobalRuntimeMessages([message]);
    }

    await Promise.resolve();
  }
}
