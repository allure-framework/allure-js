it("custom", () => {
  allure.label("foo", "bar");
});

it("allureId", () => {
  allure.id("42");
});

it("epic", () => {
  allure.epic("foo");
});

it("owner", () => {
  allure.owner("foo");
});

it("parentSuite", () => {
  allure.parentSuite("foo");
});

it("subSuite", () => {
  allure.subSuite("foo");
});

it("severity", () => {
  allure.severity("foo");
});

it("story", () => {
  allure.story("foo");
});

it("suite", () => {
  allure.suite("foo");
});

it("tag", () => {
  allure.tag("foo");
});

it("feature", () => {
  allure.feature("foo");
});
