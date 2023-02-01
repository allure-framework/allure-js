it("adds categories", async ({ browser, currentTest }) => {
  await browser.category(currentTest.id(), {
    name: "foo",
    matchedStatuses: ["failed"],
    messageRegex: "^message_reg$",
  });
  await browser.category(currentTest.id(), {
    name: "bar",
    matchedStatuses: ["passed"],
    traceRegex: "^trace_reg$",
  });
});
