const { Given } = require("@cucumber/cucumber");
const { expect } = require("chai");

Given("a passed step", () => {
  expect(1).eq(1);
});

Given("a failed step", () => {
  expect(1).eq(2);
});

Given("a step with browser parameter", async function () {
  await this.parameter("Browser", "firefox");
});
