/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";
import { AllureRuntime } from "../../../allure2-js-commons/dist/declarations/index";

defineSupportCode(function(steps) {
	steps.Given(/^passing given with table:$/, function(table) {});

	steps.Given(/^passing given with string:$/, function(string) {});
});
