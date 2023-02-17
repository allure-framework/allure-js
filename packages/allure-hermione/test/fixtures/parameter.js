it("adds parameter", async ({ browser, currentTest }) => {
  await browser.parameter(currentTest.id(), "foo", "bar", {
    excluded: false,
    mode: "hidden",
  });
});
