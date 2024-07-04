import type { Global } from "@jest/types";
import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";
import type { AllureJestEnvironment } from "./model.js";

export class AllureJestTestRuntime extends MessageTestRuntime {
  constructor(
    private readonly jestEnvironment: AllureJestEnvironment,
    private readonly context: Global.Global,
  ) {
    super();
    context.allureTestRuntime = () => this;
  }

  async sendMessage(message: RuntimeMessage) {
    this.jestEnvironment.handleAllureRuntimeMessage(message);

    await Promise.resolve();
  }
}
