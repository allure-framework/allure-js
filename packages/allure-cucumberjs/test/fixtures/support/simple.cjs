const { Given } = require("@cucumber/cucumber");
const { equal } = require("node:assert")

Given("a passed step", async () => {
  equal(1, 1);
});

Given("a failed step", () => {
  equal(1, 2);
});

Given("a broken step", async function () {
  throw new Error("an error");
});
