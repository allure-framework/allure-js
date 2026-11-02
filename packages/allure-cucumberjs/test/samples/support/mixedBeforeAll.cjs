const { Given, BeforeAll } = require("@cucumber/cucumber");

BeforeAll(() => {});

BeforeAll(() => {
  throw new Error("beforeAll error");
});

Given("a passed step", () => {});
