const { Given } = require("@cucumber/cucumber");
const { equal } = require("node:assert");

Given("a background step", async () => {
  equal(1, 1);
});

Given("another background step", async () => {
  equal(2, 2);
});

Given("a passed step", async () => {
  equal(1, 1);
});

Given("a failed step", () => {
  equal(1, 2);
});
