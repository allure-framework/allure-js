const { allure } = require("../../dist/runtime");
it("custom", async ({ browser }) => {
  await allure(browser).link("https://example.org", "bar", "foo");
});

it("tms", async ({ browser }) => {
  await allure(browser).tms("https://example.org", "foo");
});

it("issue", async ({ browser }) => {
  await allure(browser).issue("https://example.org", "foo");
});
