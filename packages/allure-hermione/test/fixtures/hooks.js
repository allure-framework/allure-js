const { allure } = require("../../dist/runtime");

describe("hooks", () => {
  beforeEach(async ({ browser }) => {
    await allure(browser).label("hook", "before");
  });

  afterEach(async ({ browser }) => {
    await allure(browser).label("hook", "after");
  });

  it("first test", () => {});

  it("second test", () => {});

  it("third test", () => {});
});
