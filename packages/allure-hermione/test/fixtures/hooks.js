describe("hooks", () => {
  beforeEach(async ({ browser, currentTest }) => {
    await browser.label(currentTest.id, "hook", "before");
  });

  afterEach(async ({ browser, currentTest }) => {
    await browser.label(currentTest.id, "hook", "after");
  });

  it("first test", () => {});

  it("second test", () => {});

  it("third test", () => {});
});
