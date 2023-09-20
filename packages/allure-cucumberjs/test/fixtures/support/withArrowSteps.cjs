const { Given } = require("@cucumber/cucumber");

Given("allows to define succeed arrow lambda step", async function () {
  await this.step("first nested step", async (s1) => {
    s1.label("label_name", "label_value");

    await s1.step("second nested step", (s2) => {
      s2.epic("foo");
      s2.attach(JSON.stringify({ foo: "bar" }), "application/json");
    });
  });
});

Given("allows to define another failed arrow lambda step", async function () {
  await this.step("first nested step", () => {
    throw new Error("error message");
  });
});
