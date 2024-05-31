import type { RuntimeMessage } from "allure-js-commons/sdk";
import type { ReporterRuntime } from "allure-js-commons/sdk/reporter";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";

export class MochaTestRuntime extends MessageTestRuntime {
  constructor(private readonly reporterRuntime: ReporterRuntime) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporterRuntime.applyRuntimeMessages([message]);
    await Promise.resolve();
  }
}
