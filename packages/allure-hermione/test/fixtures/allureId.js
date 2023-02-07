it("adds allure id", async ({ browser, currentTest }) => {
  await browser.id(currentTest.id(), "42");
});
