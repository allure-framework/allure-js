it("markdown description", async ({ browser, currentTest }) => {
  await browser.description(currentTest.id, "foo");
});

it("html description", async ({ browser, currentTest }) => {
  await browser.descriptionHtml(currentTest.id, "foo");
});
