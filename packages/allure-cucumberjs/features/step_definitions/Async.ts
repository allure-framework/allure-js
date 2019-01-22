/* eslint-disable new-cap */
import { defineSupportCode } from "cucumber";
import { delay, delayFail } from "./helpers";

defineSupportCode(function(steps) {
  steps.Given(/^passing async given$/, async function() {
    await delay(10);
  });
  steps.When(/^passing async when$/, async function() {
    await delay(10);
  });
  steps.Then(/^passing async then$/, async function() {
    await delay(10);
  });

  steps.Given(/^failing async given$/, async function() {
    await this.allure.step("Inner step 1", async() => {
      await this.allure.step("Inner step 1-1", async function() {
        await delay(10);
      });
      this.allure.step("Inner step 1-2", function() {
      });
      await delayFail(10);
    });
  });
  steps.When(/^failing async when$/, async function() {
    await delayFail(10);
  });
  steps.Then(/^failing async then$/, async function() {
    await delayFail(10);
  });
});
