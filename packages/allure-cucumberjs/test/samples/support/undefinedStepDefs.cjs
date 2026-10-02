const { Given, Then } = require("@cucumber/cucumber");

Given("defined step", function () {});

Then("pending step", function () {
  return "pending";
});

Then("ambiguous step", function () {});

Then(/^ambiguous step$/, function () {});

Then("another step", function () {});
