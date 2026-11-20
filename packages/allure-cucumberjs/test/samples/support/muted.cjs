const { Given } = require("@cucumber/cucumber");

Given("a muted step", () => {
  throw new Error("muted body executed");
});

Given("a survivor step", () => {});
