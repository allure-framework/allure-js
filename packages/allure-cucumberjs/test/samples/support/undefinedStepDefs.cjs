const { Given, Then } = require("@cucumber/cucumber");

Given("defined step", function () {});

Then("pending step", function () {
  return "pending";
});

Then("another step", function () {});
