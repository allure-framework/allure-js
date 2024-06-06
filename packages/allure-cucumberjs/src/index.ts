import { Before } from "@cucumber/cucumber";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureCucumberWorld } from "./legacy.js";
import { ALLURE_SETUP_REPORTER_HOOK } from "./model.js";
import { AllureCucumberTestRuntime } from "./runtime.js";

Before({ name: ALLURE_SETUP_REPORTER_HOOK }, function () {
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
