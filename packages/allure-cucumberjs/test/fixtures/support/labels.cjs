const { Given } = require("@cucumber/cucumber");

Given("a step", () => {});

Given("a step with label", function () {
  this.label("label", "value");
});
