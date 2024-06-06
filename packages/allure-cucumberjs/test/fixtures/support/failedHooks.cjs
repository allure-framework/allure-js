const { Given, Before, After } = require("@cucumber/cucumber");

Before(() => {
  throw new Error("before error");
});

After(() => {
  throw new Error("after error");
});

Given("a passed step", () => {});
