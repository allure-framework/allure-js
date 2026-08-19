const { Given, BeforeAll } = require("@cucumber/cucumber");

BeforeAll(() => {
  throw new Error("");
});

Given("a passed step", () => {});
