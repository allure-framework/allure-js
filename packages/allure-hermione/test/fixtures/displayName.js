const { allure } = require("../../dist/runtime");

it("display name", async ({ browser }) => {
  await allure(browser).displayName("foo");
});
