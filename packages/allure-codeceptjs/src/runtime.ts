import { MessageTestRuntime, RuntimeMessage } from "allure-js-commons/sdk/node";
import { AllureCodeceptJsReporter } from "./reporter.js";

export class AllureCodeceptJsTestRuntime extends MessageTestRuntime {
  constructor(private readonly reporter: AllureCodeceptJsReporter) {
    super();
  }

  async sendMessage(message: RuntimeMessage) {
    this.reporter.handleRuntimeMessage(message);
    await Promise.resolve();
  }
}
