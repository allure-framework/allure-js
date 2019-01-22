/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";

defineSupportCode(function(consumer) {
  consumer.When(/^I do double (\d+)$/, function(...args) {
    this.attach("AZAZAZA");
    return args[0] * 2;
  });

  consumer.Given(/^background given$/, function(...args) {
    return true;
  });

  consumer.When(/^background when$/, function() {
    this.allure.step("Inner step 1", () => {
      this.allure.step("Inner step 1-1", function() {
      });
      this.allure.step("Inner step 1-2", function() {
      });
    });
    this.allure.step("Inner step 2", function() {
    });
  });

  consumer.When(/^test throws message "([^"]*)"$/, function(message) {
    throw new Error(message);
  });

  consumer.When(/^test throws undefined message$/, function() {
    throw new Error(undefined);
  });

  consumer.Given(/^step is ambiguous$/, function() {
    return true;
  });
  consumer.When(/^step is ambiguous$/, function() {
    return true;
  });
  consumer.Then(/^step is ambiguous$/, function() {
    return true;
  });
});
