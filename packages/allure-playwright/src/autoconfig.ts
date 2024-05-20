import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllurePlaywrightTestRuntime } from "./runtime.js";

setGlobalTestRuntime(new AllurePlaywrightTestRuntime());
