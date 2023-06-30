it("custom", async ({ browser, currentTest }) => {
  await browser.link(currentTest.id, "http://example.org", "bar", "foo");
});

it("tms", async ({ browser, currentTest }) => {
  await browser.tms(currentTest.id, "foo", "http://example.org");
});

it("issue", async ({ browser, currentTest }) => {
  await browser.issue(currentTest.id, "foo", "http://example.org");
});
