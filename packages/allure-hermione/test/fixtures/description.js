const { allure } = require("../../dist/runtime");

it("markdown description", async ({ browser }) => {
  await allure(browser).description("foo");
});

it("html description", async ({ browser }) => {
  await allure(browser).descriptionHtml("fooHtml");
});
