const { Given } = require("@cucumber/cucumber");

Given("a step", () => {});

Given("a step with all the possible labels", async function () {
  await this.label("foo", "bar");
  await this.allureId("foo");
  await this.epic("foo");
  await this.feature("foo");
  await this.layer("foo");
  await this.owner("foo");
  await this.parentSuite("foo");
  await this.subSuite("foo");
  await this.suite("foo");
  await this.severity("foo");
  await this.story("foo");
  await this.tag("foo");
});
