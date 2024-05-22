import { Before } from "@cucumber/cucumber";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllureCucumberTestRuntime } from "./runtime.js";
import { AllureCucumberWorld } from "./world.js";

Before(function () {
  // TODO: we can implement testplan logic there
  setGlobalTestRuntime(
    new AllureCucumberTestRuntime({
      attach: this.attach,
      log: this.log,
      parameters: this.parameters,
    }),
  );
});

export { AllureCucumberTestRuntime, AllureCucumberWorld };
