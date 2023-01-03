it("adds label", async ({ browser, currentTest }) => {
  await browser.label(currentTest.id(), "foo", "bar")
})
