const { Given, When, setWorldConstructor } = require("@cucumber/cucumber");
const { CucumberAllureWorld } = require("allure-cucumberjs");

class CustomWorld extends CucumberAllureWorld {
  customWorldMethod() {}
}

setWorldConstructor(CustomWorld);

Given("a step", function () {});

When("world say hello", function () {
  this.customWorldMethod();
});
