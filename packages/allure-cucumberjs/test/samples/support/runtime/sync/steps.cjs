const { Given } = require("@cucumber/cucumber");
const { attachment, epic, label, step } = require("allure-js-commons/sync");

Given("allows to define runtime step", () => {
  step("first nested step", () => {
    label("label_name", "label_value");

    step("second nested step", () => {
      epic("foo");
      attachment("My attachment", JSON.stringify({ foo: "bar" }), { contentType: "application/json" });
    });
  });
});

Given("allows to define another broken runtime step", () => {
  step("first nested step", () => {
    throw new Error("error message");
  });
});
