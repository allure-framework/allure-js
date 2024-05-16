const { Given } = require("@cucumber/cucumber");
const { step, label, epic, attachment } = require("allure-js-commons");

Given("allows to define runtime step", async () => {
  await step("first nested step", async function () {
    await label("label_name", "label_value");

    await step("second nested step", async () => {
      await epic("foo");
      await attachment("My attachment", JSON.stringify({ foo: "bar" }), "application/json");
    });
  });
});

Given("allows to define another broken runtime step", async () => {
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  await step("first nested step", async () => {
    throw new Error("error message");
  });
});
