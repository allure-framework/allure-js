import type { RuntimeMessage } from "allure-js-commons/sdk";
import { MessageTestRuntime } from "allure-js-commons/sdk/runtime";
import type { AllureCodeceptJsReporter } from "./reporter.js";

export class AllureCodeceptJsTestRuntime extends MessageTestRuntime {
  private readonly reporter: AllureCodeceptJsReporter;

  constructor(reporter: AllureCodeceptJsReporter) {
    super();
    this.reporter = reporter;
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporter.handleRuntimeMessage(message);
    await Promise.resolve();
  }
}
