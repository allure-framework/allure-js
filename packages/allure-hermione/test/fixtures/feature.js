it("adds feature", async ({ browser, currentTest }) => {
  await browser.feature(currentTest.id(), "foo");
});
