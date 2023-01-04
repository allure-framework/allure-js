it("adds parent suite", async ({ browser, currentTest }) => {
  await browser.parentSuite(currentTest.id(), "foo");
});
