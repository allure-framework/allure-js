import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

import type { BunFileContext, BunRunState } from "./types.js";
import { last } from "./utils.js";

export class BunTestRuntime extends MessageTestRuntime {
  private activeFileContext: BunFileContext | null = null;

  constructor(private readonly runState: BunRunState) {
    super();
  }

  setContext(fileContext: BunFileContext) {
    this.activeFileContext = fileContext;
  }

  private applyMessage(message: RuntimeMessage) {
    if (!this.activeFileContext) {
      this.runState.allureRuntime.applyGlobalRuntimeMessages([message]);
      return;
    }

    const { allureRuntime, executables } = this.activeFileContext;
    const executableUuid = last(executables);

    if (executableUuid) {
      allureRuntime.applyRuntimeMessages(executableUuid, [message]);
    } else {
      allureRuntime.applyGlobalRuntimeMessages([message]);
    }
  }

  sendMessageSync(message: RuntimeMessage) {
    this.applyMessage(message);
  }

  async sendMessage(message: RuntimeMessage) {
    this.applyMessage(message);

    await Promise.resolve();
  }
}
