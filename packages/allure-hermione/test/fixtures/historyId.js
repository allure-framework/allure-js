it("historyId", async ({ browser, currentTest }) => {
  await browser.historyId(currentTest.id, "foo");
});
