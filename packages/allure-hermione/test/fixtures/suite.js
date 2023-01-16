it("adds suite", async ({ browser, currentTest }) => {
  await browser.suite(currentTest.id(), "foo");
});
