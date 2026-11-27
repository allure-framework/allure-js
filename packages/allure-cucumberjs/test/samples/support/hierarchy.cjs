const { Before, Given } = require("@cucumber/cucumber");
const { bdd } = require("allure-js-commons");

Before(async () => {
  await bdd("Custom feature");
});

Given("a hierarchy step", () => {});
