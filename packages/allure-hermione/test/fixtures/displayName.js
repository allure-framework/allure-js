it("display name", async ({ browser, currentTest }) => {
  await browser.displayName(currentTest.id, "foo");
});
