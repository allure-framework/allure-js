import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllurePlaywrightTestRuntime } from "./runtime.js";

setGlobalTestRuntime(new AllurePlaywrightTestRuntime());
