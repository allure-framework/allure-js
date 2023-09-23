const { allure } = require("../../dist/runtime");
it("custom", async ({ browser }) => {
  await allure(browser).label("foo", "bar");
});

it("allureId", async ({ browser }) => {
  await allure(browser).id("42");
});

it("epic", async ({ browser }) => {
  await allure(browser).epic("foo");
});

it("owner", async ({ browser }) => {
  await allure(browser).owner("foo");
});

it("parentSuite", async ({ browser }) => {
  await allure(browser).parentSuite("foo");
});

it("subSuite", async ({ browser }) => {
  await allure(browser).subSuite("foo");
});

it("severity", async ({ browser }) => {
  await allure(browser).severity("foo");
});

it("story", async ({ browser }) => {
  await allure(browser).story("foo");
});

it("suite", async ({ browser }) => {
  await allure(browser).suite("foo");
});

it("tag", async ({ browser }) => {
  await allure(browser).tag("foo");
});

it("feature", async ({ browser }) => {
  await allure(browser).feature("foo");
});
