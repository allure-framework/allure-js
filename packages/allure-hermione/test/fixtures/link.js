it("adds link", async ({ browser, currentTest }) => {
  await browser.link(currentTest.id(), "http://example.org", "bar", "foo");
});
