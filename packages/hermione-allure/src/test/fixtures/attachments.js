it("adds json attachment", async ({ browser, currentTest }) => {
  await browser.attach(currentTest.id(), JSON.stringify({ foo: "bar" }), "application/json")
})
