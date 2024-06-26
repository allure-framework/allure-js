import { BeforeAll } from "@cucumber/cucumber";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureCucumberWorld } from "./legacy.js";
import { AllureCucumberTestRuntime } from "./runtime.js";

BeforeAll(() => {
  setGlobalTestRuntime(
    // @ts-ignore
    new AllureCucumberTestRuntime(),
  );
});

export { AllureCucumberTestRuntime, AllureCucumberWorld };
