/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";
import { AllureRuntime } from "../../../allure2-js-commons/dist/declarations/index";

defineSupportCode(function(consumer) {
	consumer.When(/I do double (\d+)/, function(...args) {
		this.attach("AZAZAZA");
		return args[0] * 2;
	});

	consumer.Given(/background given/, function(...args) {
		return true;
	});

	consumer.When(/background when/, function() {
		this.allure.step("Inner step 1", () => {
			this.allure.step("Inner step 1-1", function() {});
			this.allure.step("Inner step 1-2", function() {});
		});
		this.allure.step("Inner step 2", function() {});
	});
});
