it("adds epic", async ({ browser, currentTest }) => {
  await browser.epic(currentTest.id(), "foo")
})
