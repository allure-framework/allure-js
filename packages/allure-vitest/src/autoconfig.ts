import { setGlobalTestRuntime } from "allure-js-commons/sdk/runtime";
import { AllureVitestTestRuntime } from "./runtime.js";

setGlobalTestRuntime(new MessageHolderTestRuntime());
