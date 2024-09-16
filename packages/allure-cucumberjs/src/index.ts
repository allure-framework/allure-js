import { Before, BeforeAll, world } from "@cucumber/cucumber";
import { includedInTestPlan } from "allure-js-commons/sdk/reporter";
import { parseTestPlan } from "allure-js-commons/sdk/reporter";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureCucumberWorld } from "./legacy.js";
import { AllureCucumberTestRuntime } from "./runtime.js";
import { getPosixPathRelativeToProjectRoot } from "./utils.js";

BeforeAll(() => {
  setGlobalTestRuntime(new AllureCucumberTestRuntime());
});

Before({ name: "ALLURE_FIXTURE_IGNORE" }, (scenario) => {
  const testPlan = parseTestPlan();
  if (!testPlan) {
    return;
  }
  const pickle = scenario.pickle;
  const posixPath = getPosixPathRelativeToProjectRoot(pickle);

  const fullName = `${posixPath}#${pickle.name}`;
  const tags = pickle.tags.map((tag) => tag.name);

  if (!includedInTestPlan(testPlan, { fullName, tags })) {
    // we can't use regular message or Allure facade since we need label to be added
    // to test, not fixture
    world.attach(Buffer.from("allure-skip"), "application/vnd.allure.skipcucumber+json");
    return "skipped";
  }
});

export { AllureCucumberTestRuntime, AllureCucumberWorld };
