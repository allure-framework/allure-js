const { Given, When, Then } = require("@cucumber/cucumber");

Given(/^a table step$/, (table) => {});

When(/^I add (\d+) to (\d+)$/, (a, b) => {
  console.log(a, b)
});

Then(/^result is (\d+)$/, (c) => {
  console.log(c)
});
