import { test } from "@playwright/test";
import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllurePlaywrightTestRuntime } from "./runtime.js";

if (test.info()) {
  setGlobalTestRuntime(new AllurePlaywrightTestRuntime());
}
