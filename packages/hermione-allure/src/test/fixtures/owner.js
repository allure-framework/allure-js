it("adds owner", async ({ browser, currentTest }) => {
  await browser.owner(currentTest.id(), "foo")
})
