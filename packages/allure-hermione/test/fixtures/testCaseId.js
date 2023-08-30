it("testCaseId", async ({ browser, currentTest }) => {
  await browser.testCaseId(currentTest.id, "foo");
});
