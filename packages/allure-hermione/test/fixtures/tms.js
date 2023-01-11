it("adds tms link", async ({ browser, currentTest }) => {
  await browser.tms(currentTest.id(), "foo", "http://example.org");
});
