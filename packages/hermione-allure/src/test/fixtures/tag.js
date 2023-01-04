it("adds tag", async ({ browser, currentTest }) => {
  await browser.tag(currentTest.id(), "foo");
});
