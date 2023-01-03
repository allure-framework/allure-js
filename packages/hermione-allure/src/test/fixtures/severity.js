it("adds severity", async ({ browser, currentTest }) => {
  await browser.severity(currentTest.id(), "foo")
})
