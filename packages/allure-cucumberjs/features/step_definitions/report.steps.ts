import { Then, When } from "cucumber";
import { expect } from "chai";
import chai from "chai";
import { TestResult } from "allure-js-commons";
import { ChaiPartial } from "../support/chai-partial";
import { StepResult } from "allure-js-commons";

chai.use(ChaiPartial);

When(/^I choose result for "(.*)"$/, function(name: string) {
  this.ctx = this.allureReport.testResults.find((result: TestResult) => result.name == name);
});

When(/^I choose step "(.*)"$/, function(name: string) {
  this.ctx = this.ctx.steps.find((step: StepResult) => step.name == name);
});

Then(/^it has step "(.*)"$/, function(name: string) {
  expect(this.ctx).have.property("steps");
  expect(this.ctx.steps).to.partial([{ name }]);
});

Then(/^it has status "(passed|failed|skipped|broken|undefined)"$/, function(status: string) {
  expect(this.ctx).to.partial({ status });
});

Then(/^it has label "(.*)" with value "(.*)"$/, function(name: string, value: string) {
  expect(this.ctx).partial({ labels: [{ name, value }] });
});

Then(/^it has description "(.*)"$/, function(description: string) {
  expect(this.ctx).partial({ description });
});
