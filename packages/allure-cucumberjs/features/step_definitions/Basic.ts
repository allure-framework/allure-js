/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";

defineSupportCode(function(steps) {
  steps.Given(/^passing given$/, function() {
  });
  steps.When(/^passing when$/, function() {
  });
  steps.Then(/^passing then$/, function() {
  });

  steps.Given(/^failing given$/, function() {
    this.allure.step("Inner step 1", () => {
      this.allure.step("Inner step 1-1", function() {
      });
      this.allure.step("Inner step 1-2", function() {
      });
      throw new Error("step failed!");
    });
  });
  steps.When(/^failing when$/, function() {
    throw new Error("step failed!");
  });
  steps.Then(/^failing then$/, function() {
    throw new Error("step failed!");
  });

  steps.Then(/^passing with (\d+) (\d+)$/, function(arg1, arg2) {
  });
  steps.Then(/^passing with duplicated (\d+) (\d+) (\d+) (\d+)$/, function(arg1, arg2, arg3, arg4) {
  });
  steps.Then(/^argument names are not replaced/, function() {
  });

  steps.After(function() {
    this.attach("some text is attached after every step");
  });

  steps.Before(function() {
    this.attach("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "image/png"); // eslint-disable-line max-len
  });
});
