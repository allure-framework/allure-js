import { setGlobalTestRuntime } from "allure-js-commons/sdk/node";
import { AllureVitestTestRuntime } from "./runtime.js";

console.log("vitest autoconfig, esm:", typeof __dirname === "undefined");

setGlobalTestRuntime(new AllureVitestTestRuntime());
