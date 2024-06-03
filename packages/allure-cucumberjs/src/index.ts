import { Before } from "@cucumber/cucumber";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureCucumberTestRuntime } from "./runtime.js";
import { AllureCucumberWorld } from "./legacy.js";

Before(function () {
  // TODO: we can implement testplan logic there
  setGlobalTestRuntime(
    // @ts-ignore
    new AllureCucumberTestRuntime({
      attach: this.attach,
      log: this.log,
      parameters: this.parameters,
    }),
  );
});

export { AllureCucumberTestRuntime, AllureCucumberWorld };
