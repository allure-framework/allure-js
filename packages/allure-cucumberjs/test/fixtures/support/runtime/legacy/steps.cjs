const { Given } = require("@cucumber/cucumber");

Given("allows to define runtime step", async function () {
  const self = this;

  await self.step("first nested step", async function () {
    await self.label("label_name", "label_value");

    await self.step("second nested step", async function () {
      await self.epic("foo");
      await self.attachment("My attachment", JSON.stringify({ foo: "bar" }), "application/json");
    });
  });
});

Given("allows to define another broken runtime step", async function () {
  // eslint-disable-next-line prefer-arrow/prefer-arrow-functions
  await this.step("first nested step", async function () {
    throw new Error("error message");
  });
});
