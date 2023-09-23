const { Given } = require("@cucumber/cucumber");

Given("allows to define succeed lambda step", async function () {
  await this.step("first nested step", async function () {
    this.label("label_name", "label_value");

    await this.step("second nested step", function () {
      this.epic("foo");
      this.attach(JSON.stringify({ foo: "bar" }), "application/json");
    });
  });
});

Given("allows to define another failed lambda step", async function () {
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  await this.step("first nested step", function () {
    throw new Error("error message");
  });
});
