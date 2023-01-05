it("adds sub suite", async ({ browser, currentTest }) => {
  await browser.subSuite(currentTest.id(), "foo");
});
