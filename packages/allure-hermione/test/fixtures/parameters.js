const { allure } = require("../../dist/runtime");
it("custom", async ({ browser }) => {
  await allure(browser).parameter("foo", "bar", {
    excluded: false,
    mode: "hidden",
  });
});
