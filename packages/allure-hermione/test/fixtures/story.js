it("adds story", async ({ browser, currentTest }) => {
  await browser.story(currentTest.id(), "foo");
});
