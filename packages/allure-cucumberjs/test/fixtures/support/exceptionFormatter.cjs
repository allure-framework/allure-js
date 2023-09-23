const { Given } = require("@cucumber/cucumber");

Given(/^throws an error$/, (_) => {
  throw new Error("error message");
});
