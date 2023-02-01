it("adds environment info", async ({ browser, currentTest }) => {
  await browser.environmentInfo(currentTest.id(), {
    foo: "bar",
  });
});
