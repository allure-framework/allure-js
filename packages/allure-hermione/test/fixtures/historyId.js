const { allure } = require("../../dist/runtime");
it("historyId", async ({ browser, currentTest }) => {
  await allure(browser).historyId("foo");
});
