const { Given, AfterAll } = require("@cucumber/cucumber");

AfterAll(() => {
  throw new Error("afterAll error");
});

Given("a passed step", () => {});
