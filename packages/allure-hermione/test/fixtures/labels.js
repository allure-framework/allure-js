it("custom", async ({ browser, currentTest }) => {
  await browser.label(currentTest.id, "foo", "bar");
});

it("allureId", async ({ browser, currentTest }) => {
  await browser.id(currentTest.id, "42");
});

it("epic", async ({ browser, currentTest }) => {
  await browser.epic(currentTest.id, "foo");
});

it("owner", async ({ browser, currentTest }) => {
  await browser.owner(currentTest.id, "foo");
});

it("parentSuite", async ({ browser, currentTest }) => {
  await browser.parentSuite(currentTest.id, "foo");
});

it("subSuite", async ({ browser, currentTest }) => {
  await browser.subSuite(currentTest.id, "foo");
});

it("severity", async ({ browser, currentTest }) => {
  await browser.severity(currentTest.id, "foo");
});

it("story", async ({ browser, currentTest }) => {
  await browser.story(currentTest.id, "foo");
});

it("suite", async ({ browser, currentTest }) => {
  await browser.suite(currentTest.id, "foo");
});

it("tag", async ({ browser, currentTest }) => {
  await browser.tag(currentTest.id, "foo");
});

it("feature", async ({ browser, currentTest }) => {
  await browser.feature(currentTest.id, "foo");
});
