it("adds issue link", async ({ browser, currentTest }) => {
  await browser.issue(currentTest.id(), "foo", "http://example.org")
})
