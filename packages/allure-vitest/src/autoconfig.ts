import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllureVitestTestRuntime } from "./runtime.js";

setGlobalTestRuntime(new AllureVitestTestRuntime());
