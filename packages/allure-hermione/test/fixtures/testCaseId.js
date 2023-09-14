const { allure } = require("../../dist/runtime");
it("testCaseId", async ({ browser }) => {
  await allure(browser).testCaseId("foo");
});
