const { allure } = require("../../dist/runtime");

it("json", async ({ browser }) => {
  await allure(browser).attachment(JSON.stringify({ foo: "bar" }), "application/json");
});
