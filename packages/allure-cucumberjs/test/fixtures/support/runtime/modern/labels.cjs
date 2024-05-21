const { Given } = require("@cucumber/cucumber");
const {
  label,
  allureId,
  epic,
  feature,
  layer,
  owner,
  parentSuite,
  suite,
  subSuite,
  severity,
  story,
  tag,
} = require("allure-js-commons");

Given("a step", () => {});

Given("a step with all the possible labels", async () => {
  await label("foo", "bar");
  await allureId("foo");
  await epic("foo");
  await feature("foo");
  await layer("foo");
  await owner("foo");
  await parentSuite("foo");
  await subSuite("foo");
  await suite("foo");
  await severity("foo");
  await story("foo");
  await tag("foo");
});
