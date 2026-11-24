const { Given } = require("@cucumber/cucumber");

Given("a excluded step", () => {
  throw new Error("excluded body executed");
});

Given("a survivor step", () => {});
